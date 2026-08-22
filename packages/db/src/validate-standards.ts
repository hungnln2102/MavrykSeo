import fs from 'fs';
import path from 'path';

export function validateStandards(filePath: string): { valid: boolean; errors: string[] } {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const errors: string[] = [];
  const controlIds = new Set<string>();
  const sourceIds = new Set<string>();

  let version = '';
  let date = '';
  let inSourcesSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Parse version metadata
    if (line.includes('**Phiên bản:**')) {
      const match = line.match(/\*\*Phiên bản:\*\*\s*(.*)/);
      if (match) version = match[1].trim();
    }
    if (line.includes('**Ngày khóa nguồn:**')) {
      const match = line.match(/\*\*Ngày khóa nguồn:\*\*\s*(.*)/);
      if (match) date = match[1].trim();
    }

    // Identify sources section
    if (line.startsWith('### 0.1. Nguồn chính')) {
      inSourcesSection = true;
      continue;
    } else if (inSourcesSection && line.startsWith('### ')) {
      inSourcesSection = false;
    }

    if (inSourcesSection && line.startsWith('| SRC-')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const id = parts[1];
        const linkCell = parts[2];
        const urlMatch = linkCell.match(/\[(.*?)\]\((.*?)\)/);

        if (sourceIds.has(id)) {
          errors.push(`Duplicate source ID at line ${i + 1}: ${id}`);
        } else {
          sourceIds.add(id);
        }

        if (!urlMatch) {
          errors.push(`Invalid source link format at line ${i + 1}: ${linkCell}`);
        } else {
          const url = urlMatch[2];
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            errors.push(`Invalid URL protocol at line ${i + 1}: ${url}`);
          }
        }
      }
    }

    // Parse checklist items
    if (line.startsWith('- [ ] **')) {
      const match = line.match(/^- \[ \] \*\*([A-Za-z0-9\-]+)\*\*\s*(.*)/);
      if (match) {
        const code = match[1];
        const description = match[2].trim();

        if (controlIds.has(code)) {
          errors.push(`Duplicate Control ID at line ${i + 1}: ${code}`);
        } else {
          controlIds.add(code);
        }

        if (!description) {
          errors.push(`Empty description for Control ID at line ${i + 1}: ${code}`);
        }
      }
    }
  }

  if (!version) {
    errors.push('Missing required metadata: Version (Phiên bản)');
  }
  if (!date) {
    errors.push('Missing required metadata: Effective Date (Ngày khóa nguồn)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Support direct run
const isMainModule = !module.parent || (module.filename && process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(module.filename) ||
  path.resolve(process.argv[1]) === path.resolve(module.filename.replace(/\.ts$/, '.js'))
));

if (isMainModule) {
  // Direct CLI invocation
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

  console.log(`Validating standards document at: ${targetPath}`);
  const result = validateStandards(targetPath);
  if (result.valid) {
    console.log('✓ Validation successful! Checklist document is clean.');
    process.exit(0);
  } else {
    console.error('✗ Validation failed with following errors:');
    result.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
}
