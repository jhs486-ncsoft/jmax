# Debugging Guide

## Common Issues

### MCP Server Connection Failed
- Check if the MCP server command is installed
- Verify environment variables (especially for Atlassian)
- Check network connectivity

### Git Operations Failed
- Verify git is installed and configured
- Check if `gh` CLI is installed for PR operations
- Ensure proper authentication

### Skill Execution Failed
- Check skill definition files in /skills directory
- Verify skill is registered in SkillEngine
- Check SkillContext is properly constructed

## Log Files
- `logs/session.log` - All session activities
- `logs/task.log` - Task execution details
- `logs/tool.log` - Tool calls and results
- `logs/git.log` - Git operations
- `logs/reasoning.log` - AI reasoning traces
