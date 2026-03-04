// Git Automation - Git 작업 자동화
import simpleGit, { type SimpleGit, type SimpleGitOptions } from "simple-git";
import type { GitConfig, PRInfo, Logger } from "../types/index.js";

export class GitAutomation {
  private git: SimpleGit;
  private logger: Logger;
  private config: GitConfig;

  constructor(logger: Logger, config: GitConfig, workDir: string = ".") {
    this.logger = logger;
    this.config = config;

    const options: Partial<SimpleGitOptions> = {
      baseDir: workDir,
      binary: "git",
      maxConcurrentProcesses: 6,
      trimmed: false,
    };

    this.git = simpleGit(options);
  }

  async init(): Promise<void> {
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      await this.git.init();
      this.logger.info("git", "Git repository initialized");
    }
  }

  async createBranch(name: string): Promise<void> {
    this.logger.info("git", `Creating branch: ${name}`);
    await this.git.checkoutLocalBranch(name);
  }

  async checkout(branch: string): Promise<void> {
    this.logger.info("git", `Checking out: ${branch}`);
    await this.git.checkout(branch);
  }

  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || "unknown";
  }

  async add(files: string | string[] = "."): Promise<void> {
    const fileList = Array.isArray(files) ? files : [files];
    this.logger.info("git", `Staging files: ${fileList.join(", ")}`);
    await this.git.add(fileList);
  }

  async commit(message: string): Promise<string> {
    this.logger.info("git", `Committing: ${message}`);
    const result = await this.git.commit(message);
    this.logger.info("git", `Committed: ${result.commit}`);
    return result.commit;
  }

  async push(branch?: string, remote: string = "origin"): Promise<void> {
    const branchName = branch || (await this.getCurrentBranch());
    this.logger.info("git", `Pushing to ${remote}/${branchName}`);
    await this.git.push(remote, branchName, ["--set-upstream"]);
  }

  async status(): Promise<{
    modified: string[];
    created: string[];
    deleted: string[];
    staged: string[];
    isClean: boolean;
  }> {
    const result = await this.git.status();
    return {
      modified: result.modified,
      created: result.not_added,
      deleted: result.deleted,
      staged: result.staged,
      isClean: result.isClean(),
    };
  }

  async log(count: number = 10): Promise<
    Array<{
      hash: string;
      message: string;
      date: string;
      author: string;
    }>
  > {
    const log = await this.git.log({ maxCount: count });
    return log.all.map((entry) => ({
      hash: entry.hash.slice(0, 7),
      message: entry.message,
      date: entry.date,
      author: entry.author_name,
    }));
  }

  async diff(staged: boolean = false): Promise<string> {
    if (staged) {
      return this.git.diff(["--cached"]);
    }
    return this.git.diff();
  }

  async tag(name: string, message?: string): Promise<void> {
    this.logger.info("git", `Creating tag: ${name}`);
    if (message) {
      await this.git.tag(["-a", name, "-m", message]);
    } else {
      await this.git.tag([name]);
    }
  }

  // PR creation uses `gh` CLI tool
  async createPR(pr: PRInfo): Promise<string> {
    this.logger.info("git", `Creating PR: ${pr.title}`);

    const { execSync } = await import("node:child_process");

    const labelFlag =
      pr.labels && pr.labels.length > 0
        ? ` --label "${pr.labels.join(",")}"`
        : "";

    const cmd = `gh pr create --title "${pr.title}" --body "${pr.body}" --base "${pr.baseBranch}" --head "${pr.branch}"${labelFlag}`;

    try {
      const result = execSync(cmd, { encoding: "utf-8" }).trim();
      this.logger.info("git", `PR created: ${result}`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error("git", `PR creation failed: ${msg}`);
      throw new Error(`PR creation failed: ${msg}`);
    }
  }

  async mergePR(prNumber?: number): Promise<void> {
    this.logger.info("git", `Merging PR${prNumber ? ` #${prNumber}` : ""}...`);

    const { execSync } = await import("node:child_process");
    const prArg = prNumber ? ` ${prNumber}` : "";

    try {
      execSync(`gh pr merge${prArg} --merge --delete-branch`, {
        encoding: "utf-8",
      });
      this.logger.info("git", "PR merged successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error("git", `PR merge failed: ${msg}`);
      throw new Error(`PR merge failed: ${msg}`);
    }
  }

  // Automated workflow: branch → commit → push → PR → merge
  async automatedWorkflow(
    featureName: string,
    commitMessage: string,
    prBody: string
  ): Promise<{ branch: string; commit: string; pr: string }> {
    const branchName = `feature/${featureName.replace(/\s+/g, "-").toLowerCase()}`;

    // 1. Create feature branch
    await this.createBranch(branchName);

    // 2. Stage all changes
    await this.add();

    // 3. Commit
    const commitHash = await this.commit(commitMessage);

    // 4. Push
    await this.push(branchName);

    // 5. Create PR
    const prUrl = await this.createPR({
      title: commitMessage,
      body: prBody,
      branch: branchName,
      baseBranch: this.config.baseBranch || "main",
    });

    // 6. Auto merge if enabled
    if (this.config.autoMerge) {
      await this.mergePR();
    }

    return {
      branch: branchName,
      commit: commitHash,
      pr: prUrl,
    };
  }
}
