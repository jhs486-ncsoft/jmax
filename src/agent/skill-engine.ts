// SkillEngine - Skill 로딩 및 실행
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Skill, SkillContext, SkillResult } from "../types/index.js";

export interface SkillDefinition {
  name: string;
  description: string;
  abilities: string[];
}

export class SkillEngine {
  private skills = new Map<string, Skill>();
  private definitions = new Map<string, SkillDefinition>();

  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  listDefinitions(): SkillDefinition[] {
    return Array.from(this.definitions.values());
  }

  async execute(name: string, context: SkillContext): Promise<SkillResult> {
    const skill = this.skills.get(name);
    if (!skill) {
      return {
        success: false,
        output: "",
        error: `Skill '${name}' not found`,
      };
    }

    try {
      return await skill.execute(context);
    } catch (err) {
      return {
        success: false,
        output: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async loadDefinitions(skillsDir: string): Promise<void> {
    try {
      const files = await readdir(skillsDir);
      const mdFiles = files.filter((f) => f.endsWith(".md"));

      for (const file of mdFiles) {
        const content = await readFile(join(skillsDir, file), "utf-8");
        const definition = this.parseSkillDefinition(content);
        if (definition) {
          this.definitions.set(definition.name, definition);
        }
      }
    } catch {
      // Skills directory may not exist yet
    }
  }

  private parseSkillDefinition(content: string): SkillDefinition | null {
    const lines = content.split("\n").map((l) => l.trim());

    let name = "";
    let description = "";
    const abilities: string[] = [];
    let inAbilities = false;

    for (const line of lines) {
      if (line.startsWith("skill:")) {
        name = line.replace("skill:", "").trim();
      } else if (line.startsWith("description:")) {
        description = line.replace("description:", "").trim();
      } else if (line === "abilities" || line.startsWith("abilities")) {
        inAbilities = true;
      } else if (inAbilities && line.startsWith("-")) {
        abilities.push(line.replace(/^-\s*/, "").trim());
      } else if (inAbilities && line !== "" && !line.startsWith("-")) {
        inAbilities = false;
      }
    }

    if (!name) return null;
    return { name, description, abilities };
  }
}
