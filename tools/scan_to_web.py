bl_info = {
    "name": "Scan to Website (.glb)",
    "author": "Neil Ramnarine",
    "version": (1, 0, 0),
    "blender": (4, 2, 0),
    "location": "3D View > Sidebar (N) > Web export, and File > Export > Scan for website (.glb)",
    "description": "One click: clean up a photogrammetry scan and export a small .glb for the portfolio site",
    "category": "Import-Export",
}

"""
What the button does to the selected model, in this order:
  1. Locks in rotation and scale (stand the model upright yourself first).
  2. Joins the patches the glTF import splits the model into (Merge by Distance).
  3. Lowers the triangle count to the target if the model is bigger (Decimate).
  4. Deletes loose floating bits (anything smaller than the "Keep parts above" share of the model).
  5. Exports one .glb with the textures packed in: Draco compression, JPEG images at quality 75.

Install: Edit > Preferences > Add-ons > arrow at the top right > Install from Disk > pick this file, tick it.
"""

import os
import bpy
import bmesh
import numpy as np
from bpy.props import IntProperty, FloatProperty, StringProperty
from bpy_extras.io_utils import ExportHelper


def tri_count(mesh):
    counts = np.zeros(len(mesh.polygons), dtype=np.int64)
    mesh.polygons.foreach_get("loop_total", counts)
    return int((counts - 2).sum())


def merge_patches(obj):
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    dims = obj.dimensions
    dist = max(max(dims.x, dims.y, dims.z) * 1e-5, 1e-7)   # tiny compared to the model
    before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    merged = before - len(bm.verts)
    bm.to_mesh(me)
    bm.free()
    me.update()
    return merged


def decimate(context, obj, target):
    tris = tri_count(obj.data)
    if tris <= target:
        return tris
    mod = obj.modifiers.new("WebDecimate", "DECIMATE")
    mod.ratio = max(min(target / tris, 1.0), 0.001)
    with context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return tri_count(obj.data)


def remove_loose_bits(obj, keep_share):
    """Labels connected parts and deletes every part smaller than keep_share of all faces."""
    me = obj.data
    nv, ne, nf = len(me.vertices), len(me.edges), len(me.polygons)
    if nf == 0:
        return 0
    edges = np.zeros(ne * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", edges)
    a, b = edges[0::2], edges[1::2]
    label = np.arange(nv, dtype=np.int64)
    while True:   # spread the smallest index through each connected part
        la, lb = label[a], label[b]
        low = np.minimum(la, lb)
        new = label.copy()
        np.minimum.at(new, a, low)
        np.minimum.at(new, b, low)
        new = new[new]                       # shortcut jumps make this converge fast
        if np.array_equal(new, label):
            break
        label = new
    loop_start = np.zeros(nf, dtype=np.int64)
    me.polygons.foreach_get("loop_start", loop_start)
    loop_verts = np.zeros(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", loop_verts)
    face_label = label[loop_verts[loop_start]]
    parts, sizes = np.unique(face_label, return_counts=True)
    small = set(parts[sizes < keep_share * nf].tolist())
    if not small:
        return 0
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    doomed = [bm.faces[i] for i in np.nonzero(np.isin(face_label, list(small)))[0]]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(me)
    bm.free()
    me.update()
    return len(small)


def export_glb(context, obj, path, quality):
    for o in context.view_layer.objects:
        o.select_set(o == obj)
    context.view_layer.objects.active = obj
    settings = dict(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_image_format="JPEG",
        export_jpeg_quality=quality,
        export_draco_mesh_compression_enable=True,
        export_animations=False,
    )
    try:
        bpy.ops.export_scene.gltf(**settings)
    except TypeError:
        # Option names differ between Blender versions: drop the extras and keep the essentials
        for k in ("export_jpeg_quality", "export_animations"):
            settings.pop(k, None)
        bpy.ops.export_scene.gltf(**settings)


class SCANWEB_OT_export(bpy.types.Operator, ExportHelper):
    """Clean up the selected scan and export it as a small .glb for the website"""
    bl_idname = "scanweb.export"
    bl_label = "Scan for website (.glb)"
    bl_options = {"REGISTER", "UNDO"}

    filename_ext = ".glb"
    filter_glob: StringProperty(default="*.glb", options={"HIDDEN"})

    target_tris: IntProperty(name="Max triangles", default=200000, min=10000, max=2000000,
                             description="Bigger models are reduced to about this many triangles")
    keep_share: FloatProperty(name="Keep parts above (%)", default=1.0, min=0.0, max=50.0,
                              description="Loose parts smaller than this share of the model are deleted")
    jpeg_quality: IntProperty(name="JPEG quality", default=75, min=10, max=100)

    @classmethod
    def poll(cls, context):
        o = context.active_object
        return o is not None and o.type == "MESH"

    def invoke(self, context, event):
        name = "".join(c if c.isalnum() or c in "-_" else "_" for c in context.active_object.name)
        self.filepath = bpy.path.ensure_ext(name, ".glb")
        return ExportHelper.invoke(self, context, event)

    def execute(self, context):
        obj = context.active_object
        if context.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        with context.temp_override(object=obj, active_object=obj, selected_objects=[obj], selected_editable_objects=[obj]):
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        start = tri_count(obj.data)
        merged = merge_patches(obj)
        tris = decimate(context, obj, self.target_tris)
        removed = remove_loose_bits(obj, self.keep_share / 100.0)
        tris = tri_count(obj.data)
        export_glb(context, obj, self.filepath, self.jpeg_quality)
        size = os.path.getsize(self.filepath) / 1e6 if os.path.exists(self.filepath) else 0
        msg = f"Exported {os.path.basename(self.filepath)}: {size:.1f} MB, {tris:,} triangles (was {start:,}), {removed} loose bits removed"
        if size > 20:
            msg += " - over 20 MB, lower Max triangles and export again"
        self.report({"WARNING"} if size > 20 else {"INFO"}, msg)
        return {"FINISHED"}


class SCANWEB_PT_panel(bpy.types.Panel):
    bl_label = "Web export"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Web export"

    def draw(self, context):
        col = self.layout.column()
        o = context.active_object
        if o and o.type == "MESH":
            col.label(text=f"{o.name}: {tri_count(o.data):,} triangles")
        else:
            col.label(text="Click the scan first")
        col.label(text="1. Stand the model upright")
        col.label(text="2. Click the button below")
        col.operator(SCANWEB_OT_export.bl_idname, icon="EXPORT")


def menu_func(self, context):
    self.layout.operator(SCANWEB_OT_export.bl_idname, text="Scan for website (.glb)")


classes = (SCANWEB_OT_export, SCANWEB_PT_panel)


def register():
    for c in classes:
        bpy.utils.register_class(c)
    bpy.types.TOPBAR_MT_file_export.append(menu_func)


def unregister():
    bpy.types.TOPBAR_MT_file_export.remove(menu_func)
    for c in reversed(classes):
        bpy.utils.unregister_class(c)


if __name__ == "__main__":
    register()
