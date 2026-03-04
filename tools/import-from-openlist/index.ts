#!/usr/bin/env node

/**
 * 简化版 OpenList 目录批量导入脚本（原型）
 *
 * 功能：
 * - 读取指定的本地目录，扫描安装包和 `.txt` / `.md` 元数据文件；
 * - 将配对结果输出为 JSON，供后续调用 `/api/admin/software` 或生成 SQL 使用。
 *
 * 说明：
 * - 这里不直接访问 OpenList / WebDAV，而是假定你先通过 WebDAV 将目录挂载到本地，
 *   然后对本地挂载路径运行本脚本。
 */

import { promises as fs } from "fs";
import * as path from "path";

interface ImportItem {
  baseName: string;
  packageFile: string;
  metaFile?: string;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("用法: node index.js <本地目录路径>");
    process.exit(1);
  }

  const absDir = path.resolve(dir);
  const entries = await fs.readdir(absDir);

  const packages: Record<string, string> = {};
  const metas: Record<string, string> = {};

  for (const name of entries) {
    const full = path.join(absDir, name);
    const stat = await fs.stat(full);
    if (!stat.isFile()) continue;
    if (name.endsWith(".exe") || name.endsWith(".msi") || name.endsWith(".zip")) {
      const base = name.replace(/\.(exe|msi|zip)$/i, "");
      packages[base] = full;
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      const base = name.replace(/\.(txt|md)$/i, "");
      metas[base] = full;
    }
  }

  const items: ImportItem[] = [];
  for (const base of Object.keys(packages)) {
    items.push({
      baseName: base,
      packageFile: packages[base],
      metaFile: metas[base],
    });
  }

  console.log(JSON.stringify({ directory: absDir, items }, null, 2));
}

main().catch((err) => {
  console.error("import-from-openlist error:", err);
  process.exit(1);
});

