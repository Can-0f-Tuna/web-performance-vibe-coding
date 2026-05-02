#!/usr/bin/env node

/**
 * Web Performance Vibe Coding Skill
 * 
 * This package contains the skill files for building extremely fast
 * web applications using AI-assisted "vibe coding" techniques.
 * 
 * Usage:
 * - Install: npm install web-performance-vibe-coding
 * - Use with Claude/Code: The skill will be available in ~/.agents/skills/
 * - Reference manually: See references/ directory for detailed guides
 * 
 * @see https://github.com/Can-0f-Tuna/web-performance-vibe-coding
 */

const path = require('path');
const fs = require('fs');

// Export the path to the skill files
const skillPath = __dirname;

// Log info when run via CLI
if (require.main === module) {
  console.log('\n🚀 Web Performance Vibe Coding Skill\n');
  console.log('📦 Package Location:', skillPath);
  console.log('📄 Main Entry:', path.join(skillPath, 'SKILL.md'));
  console.log('📚 References:', path.join(skillPath, 'references/'));
  console.log('\n✅ Installation complete!');
  console.log('\n📖 To use with Claude/Code:');
  console.log('   1. Copy this skill to ~/.agents/skills/');
  console.log('   2. Or reference the files directly in your prompts');
  console.log('\n🔗 GitHub: https://github.com/Can-0f-Tuna/web-performance-vibe-coding');
  console.log('\n💡 Example prompt:');
  console.log('   "Optimize my dashboard using web-performance-vibe-coding"');
  console.log('');
}

module.exports = {
  skillPath,
  skillFile: path.join(skillPath, 'SKILL.md'),
  referencesDir: path.join(skillPath, 'references'),
  
  // Helper to read skill content
  getSkillContent() {
    return fs.readFileSync(path.join(skillPath, 'SKILL.md'), 'utf-8');
  },
  
  // Helper to list all references
  getReferences() {
    const refsDir = path.join(skillPath, 'references');
    return fs.readdirSync(refsDir).filter(f => f.endsWith('.md'));
  },
  
  // Helper to read a specific reference
  getReference(name) {
    return fs.readFileSync(path.join(skillPath, 'references', name), 'utf-8');
  }
};
