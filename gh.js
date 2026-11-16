/* Small GitHub client. Everything the admin does on GitHub goes through here. */
(function (root) {
  "use strict";
  const OWNER = "Neilvj", REPO = "neilvj.github.io", BRANCH = "main";
  const API = "https://api.github.com";

  function toBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("Could not read the file"));
      r.readAsDataURL(blob);
    });
  }
  function fromBase64Utf8(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }

  class GH {
    constructor(token) { this.token = token; }

    async req(path, opts) {
      opts = opts || {};
      let res;
      try {
        res = await fetch(API + path, {
          method: opts.method || "GET",
          headers: Object.assign({
            "Authorization": "Bearer " + this.token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
          }, opts.body ? { "Content-Type": "application/json" } : {}),
          body: opts.body ? JSON.stringify(opts.body) : undefined,
          cache: "no-store"
        });
      } catch (e) {
        throw new Error("No connection to GitHub. Check your internet and try again.");
      }
      let data = null;
      try { data = await res.json(); } catch (e) { /* empty body */ }
      if (!res.ok) {
        const msg = (data && data.message) || res.statusText;
        if (res.status === 401) throw new Error("GitHub rejected the token (expired or wrong). Log out and paste a new one.");
        if (res.status === 403 || res.status === 404) throw new Error("GitHub says no (" + res.status + "): " + msg + ". Check the token has Contents: Read and write for " + REPO + ".");
        throw new Error("GitHub error " + res.status + ": " + msg);
      }
      return data;
    }

    async checkAccess() {
      const r = await this.req("/repos/" + OWNER + "/" + REPO);
      if (!r.permissions || !r.permissions.push) throw new Error("This token can read the repo but not write to it. Set Contents to Read and write.");
      return r;
    }

    async getText(path) {
      const f = await this.req("/repos/" + OWNER + "/" + REPO + "/contents/" + path + "?ref=" + BRANCH);
      return { sha: f.sha, text: fromBase64Utf8(f.content) };
    }

    async listFiles() {
      const t = await this.req("/repos/" + OWNER + "/" + REPO + "/git/trees/" + BRANCH + "?recursive=1");
      return t.tree.filter((x) => x.type === "blob").map((x) => x.path);
    }

    async fileSha(path) {
      const f = await this.req("/repos/" + OWNER + "/" + REPO + "/contents/" + path + "?ref=" + BRANCH);
      return f.sha;
    }

    /** files: [{ path, blob }]. One commit with everything, so the site never shows half an update. */
    async commit(files, message, onStep) {
      const base = "/repos/" + OWNER + "/" + REPO;
      const step = onStep || function () {};
      step("Reading the latest version…");
      const ref = await this.req(base + "/git/ref/heads/" + BRANCH);
      const headSha = ref.object.sha;
      const head = await this.req(base + "/git/commits/" + headSha);
      const entries = [];
      let n = 0;
      for (const f of files) {
        n++;
        step("Uploading " + n + " of " + files.length + ": " + f.path);
        const blob = await this.req(base + "/git/blobs", { method: "POST", body: { content: await toBase64(f.blob), encoding: "base64" } });
        entries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
      }
      step("Saving the update…");
      const tree = await this.req(base + "/git/trees", { method: "POST", body: { base_tree: head.tree.sha, tree: entries } });
      const commit = await this.req(base + "/git/commits", { method: "POST", body: { message: message, tree: tree.sha, parents: [headSha] } });
      await this.req(base + "/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: commit.sha } });
      return commit.sha;
    }
  }

  root.GH = GH;
  root.GH_CONFIG = { OWNER: OWNER, REPO: REPO, BRANCH: BRANCH, SITE: "https://" + OWNER.toLowerCase() + ".github.io/" };
})(window);
