import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { eq, inArray } from 'drizzle-orm';
import {
  client,
  db,
  standardVersions,
  standardSources,
  auditModules,
  auditControls,
  controlSources,
  auditRuns
} from './index.js';

export async function seedStandards(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Calculate manifest hash
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  // 2. Parse version & date
  let version = '1.0';
  let dateStr = new Date().toISOString();
  
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes('**Phiên bản:**')) {
      const match = line.match(/\*\*Phiên bản:\*\*\s*(.*)/);
      if (match) version = match[1].trim();
    }
    if (line.includes('**Ngày khóa nguồn:**')) {
      const match = line.match(/\*\*Ngày khóa nguồn:\*\*\s*(.*)/);
      if (match) dateStr = match[1].trim();
    }
  }

  const effectiveAt = new Date(dateStr);

  console.log(`Processing standard version: ${version} (${effectiveAt.toISOString()})`);

  // 3. Immutability Lock check
  const existingVersion = await db
    .select({ id: standardVersions.id })
    .from(standardVersions)
    .where(eq(standardVersions.version, version))
    .limit(1);

  if (existingVersion.length > 0) {
    const versionId = existingVersion[0].id;
    const linkedRuns = await db
      .select({ id: auditRuns.id })
      .from(auditRuns)
      .where(eq(auditRuns.standardVersionId, versionId))
      .limit(1);

    if (linkedRuns.length > 0) {
      throw new Error(`Immutability lock triggered: Standard version ${version} is linked to historical audit runs. Modifying it is forbidden.`);
    }

    console.log(`Version ${version} exists but is not linked to any audit runs. Cleaning up existing standard entries for overwrite...`);
    
    // Clean up existing controls for this version (cascade delete handled by foreign key where defined)
    // Clear out auditControls
    await db.delete(auditControls).where(eq(auditControls.versionId, versionId));
    // Clear standard version
    await db.delete(standardVersions).where(eq(standardVersions.id, versionId));
  }

  // 4. Parse Standard Sources
  const sourcesToInsert: { code: string; name: string; url: string; authorityLevel: string }[] = [];
  let inSourcesSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### 0.1. Nguồn chính')) {
      inSourcesSection = true;
      continue;
    } else if (inSourcesSection && trimmed.startsWith('### ')) {
      inSourcesSection = false;
    }

    if (inSourcesSection && trimmed.startsWith('| SRC-')) {
      const parts = trimmed.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const code = parts[1];
        const linkCell = parts[2];
        const urlMatch = linkCell.match(/\[(.*?)\]\((.*?)\)/);
        if (urlMatch) {
          sourcesToInsert.push({
            code,
            name: urlMatch[1],
            url: urlMatch[2],
            authorityLevel: 'A', // Primary official sources
          });
        }
      }
    }
  }

  // 5. Parse Modules & Controls
  const modulesToInsert: { code: string; name: string; description: string }[] = [];
  const controlsToInsert: { moduleIdCode: string; code: string; phase: string; description: string }[] = [];

  let currentModuleCode = '';
  let currentPhase = 'General';

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for Module header: e.g. ## 2. Module 1 — Project Setup, Strategy và Governance
    const moduleMatch = trimmed.match(/^## \d+\. Module (\d+) — (.*)$/);
    if (moduleMatch) {
      const modNum = moduleMatch[1];
      const modName = moduleMatch[2];
      currentModuleCode = `MOD-${modNum}`;
      currentPhase = 'General';
      modulesToInsert.push({
        code: currentModuleCode,
        name: modName,
        description: `Module ${modNum} of Master SEO checklist`,
      });
      continue;
    }

    // Check for Category/Phase subheader: e.g. ### Host, HTTP và Security
    const phaseMatch = trimmed.match(/^### (.*)$/);
    if (phaseMatch && !trimmed.startsWith('### 0.1') && !trimmed.startsWith('### 0.2') && !trimmed.startsWith('### 0.3')) {
      currentPhase = phaseMatch[1].trim();
      continue;
    }

    // Check for checklist item: e.g. - [ ] **STR-001** Description
    if (trimmed.startsWith('- [ ] **')) {
      const controlMatch = trimmed.match(/^- \[ \] \*\*([A-Za-z0-9\-]+)\*\*\s*(.*)/);
      if (controlMatch && currentModuleCode) {
        const controlCode = controlMatch[1];
        const description = controlMatch[2].trim();
        controlsToInsert.push({
          moduleIdCode: currentModuleCode,
          code: controlCode,
          phase: currentPhase,
          description,
        });
      }
    }
  }

  console.log(`Parsed standard data:
  - Version: ${version}
  - Manifest SHA256: ${hash.slice(0, 10)}...
  - Sources count: ${sourcesToInsert.length}
  - Modules count: ${modulesToInsert.length}
  - Controls count: ${controlsToInsert.length}`);

  // 6. DB Ingest Transaction
  await db.transaction(async (tx) => {
    // 6.1. Insert standard version
    const [insertedVer] = await tx
      .insert(standardVersions)
      .values({
        version,
        effectiveAt,
        status: 'active',
        sourceManifestHash: hash,
      })
      .returning();

    // 6.2. Seed standard sources
    for (const src of sourcesToInsert) {
      await tx
        .insert(standardSources)
        .values({
          code: src.code,
          name: src.name,
          url: src.url,
          authorityLevel: src.authorityLevel,
        })
        .onConflictDoUpdate({
          target: standardSources.code,
          set: {
            name: src.name,
            url: src.url,
            authorityLevel: src.authorityLevel,
            updatedAt: new Date(),
          },
        });
    }

    // 6.3. Seed modules
    const codeToModuleIdMap = new Map<string, string>();
    for (const mod of modulesToInsert) {
      const [insertedMod] = await tx
        .insert(auditModules)
        .values({
          code: mod.code,
          name: mod.name,
          description: mod.description,
        })
        .onConflictDoUpdate({
          target: auditModules.code,
          set: {
            name: mod.name,
            description: mod.description,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      codeToModuleIdMap.set(mod.code, insertedMod.id);
    }

    // 6.4. Seed controls with metadata
    for (const ctrl of controlsToInsert) {
      const moduleId = codeToModuleIdMap.get(ctrl.moduleIdCode);
      if (!moduleId) {
        throw new Error(`Module code ${ctrl.moduleIdCode} not found in database insertion map.`);
      }

      const meta = resolveControlMetadata(ctrl.code, ctrl.description);

      await tx
        .insert(auditControls)
        .values({
          versionId: insertedVer.id,
          moduleId,
          code: ctrl.code,
          phase: ctrl.phase,
          description: ctrl.description,
          applicability: meta.applicability,
          evidenceLevel: meta.evidenceLevel,
          scope: meta.scope,
          severity: meta.severity,
          method: meta.method,
          acceptanceCriteria: meta.acceptanceCriteria,
          executorType: meta.executorType,
          executorKey: meta.executorKey,
        });
    }
  });

  console.log('✓ Successfully completed Standards seeding transaction.');
}

export function resolveControlMetadata(code: string, description: string) {
  let applicability: string[] = ['core'];
  if (code.startsWith('ECOM-')) {
    applicability = ['ecommerce'];
  } else if (code.startsWith('LOCAL-')) {
    applicability = ['local'];
  } else if (code.startsWith('INT-') || code.startsWith('TECH-INT-')) {
    applicability = ['international'];
  } else if (code.startsWith('MEDIA-')) {
    applicability = ['publisher'];
  } else if (code.startsWith('MIG-')) {
    applicability = ['migration'];
  } else {
    applicability = ['core'];
  }

  let severity = 'medium';
  let evidenceLevel = 'A';
  let scope = 'domain';
  let executorType = 'manual';
  let executorKey = 'manual-verification';
  let method = `Kiểm tra thủ công tài nguyên liên quan đến: ${description}`;
  let acceptanceCriteria = `Đảm bảo tiêu chuẩn ${code} được thiết lập đúng cấu trúc và không có cảnh báo.`;

  if (code.startsWith('STR-')) {
    severity = 'medium';
    evidenceLevel = 'C';
    scope = 'domain';
    executorType = 'manual';
  } else if (code.startsWith('DATA-')) {
    severity = 'high';
    evidenceLevel = 'A';
    scope = 'domain';
    executorType = 'manual';
    acceptanceCriteria = `Các tài khoản và credentials API kết nối ổn định, dữ liệu đồng bộ thành công.`;
  } else if (code.startsWith('TECH-HOST-')) {
    severity = 'critical';
    evidenceLevel = 'A';
    scope = 'domain';
    executorType = 'automated';
    executorKey = 'host-dns-check';
    method = 'Gửi HTTP request và kiểm tra trạng thái phản hồi DNS/HTTPS.';
    acceptanceCriteria = 'Mã phản hồi HTTP là 200 OK và chứng chỉ SSL hợp lệ.';
  } else if (code.startsWith('TECH-CRAWL-')) {
    severity = 'high';
    evidenceLevel = 'A';
    scope = 'url';
    executorType = 'automated';
    executorKey = 'crawler-directives';
    method = 'Quét robots.txt, sitemaps và HTTP headers.';
    acceptanceCriteria = 'robots.txt hợp lệ và sitemap không chứa lỗi.';
  } else if (code.startsWith('TECH-IDX-')) {
    severity = 'critical';
    evidenceLevel = 'A';
    scope = 'url';
    executorType = 'automated';
    executorKey = 'indexing-status';
    method = 'Phân tích response header X-Robots-Tag, meta tag noindex và canonical tag.';
    acceptanceCriteria = 'Đường dẫn canonical trỏ về chính nó hoặc trang gốc hợp lệ và status code 200.';
  } else if (code.startsWith('TECH-JS-')) {
    severity = 'high';
    evidenceLevel = 'A';
    scope = 'url';
    executorType = 'automated';
    executorKey = 'javascript-renderer';
    method = 'So sánh DOM structure giữa Raw HTML và Rendered HTML.';
    acceptanceCriteria = 'Không xuất hiện lỗi render nghiêm trọng hay lệch nội dung.';
  } else if (code.startsWith('TECH-CWV-')) {
    severity = 'high';
    evidenceLevel = 'B';
    scope = 'url';
    executorType = 'automated';
    executorKey = 'pagespeed-vitals';
    method = 'Gọi PageSpeed Insights API hoặc đo đạc dữ liệu thực tế (CrUX).';
    acceptanceCriteria = 'Các chỉ số CWV (LCP, INP, CLS) nằm trong ngưỡng an toàn.';
  } else if (code.startsWith('ONP-')) {
    severity = 'high';
    evidenceLevel = 'B';
    scope = 'url';
    executorType = 'automated';
    executorKey = 'onpage-analyzer';
    method = 'Quét các thẻ meta tags, title, headings và cấu trúc nội dung.';
    acceptanceCriteria = 'Title và H1 tồn tại, meta description không trùng lặp.';
  } else if (code.startsWith('KW-')) {
    severity = 'medium';
    evidenceLevel = 'B';
    scope = 'domain';
    executorType = 'automated';
    executorKey = 'keyword-tracker';
    method = 'Đối chiếu vị trí từ khóa trên công cụ tìm kiếm.';
    acceptanceCriteria = 'Từ khóa được ánh xạ đến đúng target URL.';
  }

  return {
    applicability,
    evidenceLevel,
    scope,
    severity,
    method,
    acceptanceCriteria,
    executorType,
    executorKey,
  };
}

// Support direct run
const isMainModule = !module.parent || (module.filename && process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(module.filename) ||
  path.resolve(process.argv[1]) === path.resolve(module.filename.replace(/\.ts$/, '.js'))
));

if (isMainModule) {
  let targetPath = path.resolve(process.cwd(), '../../docs/MASTER-SEO-OPERATING-STANDARD-2026.md');
  if (!fs.existsSync(targetPath)) {
    targetPath = path.resolve(process.cwd(), 'docs/MASTER-SEO-OPERATING-STANDARD-2026.md');
  }
  if (!fs.existsSync(targetPath)) {
    targetPath = path.resolve(process.cwd(), '../docs/MASTER-SEO-OPERATING-STANDARD-2026.md');
  }

  if (!fs.existsSync(targetPath)) {
    console.error(`Error: Standard file not found.`);
    process.exit(1);
  }

  console.log(`Starting Database Seeding of Standards from: ${targetPath}`);
  seedStandards(targetPath)
    .then(() => {
      console.log('✓ Standards Seeding complete.');
      process.exit(0);
    })
    .catch((err: Error) => {
      console.error('✗ Seeding failed:', err.message || err);
      process.exit(1);
    })
    .finally(async () => {
      await client.end({ timeout: 5 });
    });
}
