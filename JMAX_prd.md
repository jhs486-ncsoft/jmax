# PRD

# Enterprise AI Engineering Agent (OpenCode Fork)
Name: JMAX
Version: 1.0\
Date: 2026-03-05

------------------------------------------------------------------------

# 1. Product Overview

본 프로젝트는 **OpenCode를 fork하여 회사 맞춤형 AI Engineering Agent**를
구축하는 것을 목표로 한다.

Agent는 다음 작업을 자동 수행할 수 있어야 한다.

-   개발 요구사항 분석
-   설계 문서 작성
-   코드 생성
-   테스트 코드 생성
-   테스트 실행
-   Git Commit
-   PR 생성
-   Self Merge
-   릴리즈 생성
-   JIRA 업데이트
-   Confluence 문서 작성

즉 **개발 시작 → 개발 → 테스트 → 배포까지 전 과정을 AI가 수행하는
시스템**이다.

------------------------------------------------------------------------

# 2. Objectives

목표

1.  OpenCode 기반 AI 개발 Agent 구축
2.  개발 자동화
3.  기록 기반 개발 프로세스 구축
4.  JIRA / Confluence / GitHub 통합 자동화
5.  테스트 기반 개발 자동화

------------------------------------------------------------------------

# 3. Target Users

Primary

-   Development Director
-   Platform Architect
-   Backend Engineer

Secondary

-   DevOps Engineer
-   QA Engineer

------------------------------------------------------------------------

# 4. Base Technology

Core CLI

OpenCode

AI Model

GitHub Copilot

MCP Servers

-   context7
-   Playwright
-   Atlassian Cloud

Language

-   TypeScript
-   Node.js

UI

-   TUI (Ink / Blessed)

------------------------------------------------------------------------

# 5. High Level Architecture

                +-----------------------+
                |      TUI Console      |
                +-----------+-----------+
                            |
                            v
                +-----------------------+
                |       Agent Core      |
                +-----------+-----------+
                            |
                            v
                +-----------------------+
                |      Skill Engine     |
                +-----------+-----------+
                            |
                            v
                +-----------------------+
                |      MCP Client       |
                +-----------+-----------+
                            |
      +---------------------+---------------------+
      |                     |                     |
      v                     v                     v

Context7 MCP Playwright MCP Atlassian MCP

------------------------------------------------------------------------

# 6. Fork Strategy

Repository

company/opencode-agent

Steps

1.  OpenCode repository fork
2.  enterprise-agent branch 생성
3.  custom modules 추가
4.  MCP integration
5.  skills system 구축

------------------------------------------------------------------------

# 7. UI (TUI Console)

Terminal 기반 AI 개발 콘솔

UI Layout

┌───────────────────────────────┐ │ AI Engineering Agent │
├───────────────────────────────┤ │ Task Progress │ │ Tool Execution │ │
Git Activity │ ├───────────────────────────────┤ │ Logs │
├───────────────────────────────┤ │ Chat │ │ \> │
└───────────────────────────────┘

기능

-   Chat with AI
-   Task 진행 상태 표시
-   Tool 실행 로그
-   Git 활동 표시

------------------------------------------------------------------------

# 8. AI Model

Primary Model

GitHub Copilot

사용 API

-   Copilot Chat API
-   Copilot Completion API

Fallback

-   Claude
-   OpenAI
-   Local LLM

------------------------------------------------------------------------

# 9. MCP Integration

MCP Protocol을 통해 외부 Tool 연결

## Context7 MCP

기능

-   코드 검색
-   dependency 분석
-   프로젝트 컨텍스트 분석

예

-   search symbol
-   search reference
-   analyze dependency

------------------------------------------------------------------------

## Playwright MCP

기능

-   UI 테스트
-   E2E 테스트
-   스크린샷 생성

예

-   login flow test
-   console automation

------------------------------------------------------------------------

## Atlassian Cloud MCP

연동

JIRA Confluence

JIRA 기능

-   issue 생성
-   task 업데이트
-   PR 링크
-   comment 추가

Confluence 기능

-   architecture 문서 생성
-   API 문서 작성
-   프로젝트 문서 업데이트

------------------------------------------------------------------------

# 10. Skills System

Agent의 capability는 skills.md 로 관리한다.

Directory

/skills

예

skills/ ├ engineering.md ├ jira.md ├ meeting.md ├ devops.md └
documentation.md

------------------------------------------------------------------------

engineering.md

skill: engineering

abilities

-   design architecture
-   generate code
-   write tests
-   refactor code

------------------------------------------------------------------------

jira.md

skill: jira

abilities

-   create issue
-   update sprint
-   add comment

------------------------------------------------------------------------

meeting.md

skill: meeting

abilities

-   summarize meeting
-   extract tasks
-   create jira issues

------------------------------------------------------------------------

# 11. Development Workflow

User Request ↓ Task Planning ↓ Context Analysis ↓ Architecture Design ↓
Code Generation ↓ Test Creation ↓ Test Execution ↓ Git Commit ↓ PR
Creation ↓ PR Merge ↓ Release

------------------------------------------------------------------------

# 12. Development Logging

모든 작업은 기록된다.

Directory

/logs

구조

logs/ session.log task.log tool.log git.log reasoning.log

기록 내용

-   AI reasoning
-   tool execution
-   code changes
-   test results

------------------------------------------------------------------------

# 13. Git Automation

자동화

-   git branch 생성
-   git commit
-   git push
-   PR 생성
-   PR merge

PR Template

## Feature

Description

## Changes

-   new service
-   new api

## Test

integration test added

------------------------------------------------------------------------

# 14. Testing System

테스트 자동 생성

Test Types

Unit Test

Vitest

Integration Test

Jest

E2E Test

Playwright

------------------------------------------------------------------------

# 15. Release Pipeline

feature complete ↓ test pass ↓ PR merge ↓ tag release

Example

v0.1.0

------------------------------------------------------------------------

# 16. Repository Structure

opencode-agent

agent core skills memory architecture logs tests mcp ui git

------------------------------------------------------------------------

# 17. Memory System

AI가 프로젝트 컨텍스트를 기억한다.

memory/

project.md coding-style.md team-preference.md

------------------------------------------------------------------------

# 18. Architecture Knowledge

architecture/

system.md service-map.md data-flow.md

------------------------------------------------------------------------

# 19. Engineering Brain

brain/

debugging.md performance.md architecture-patterns.md

------------------------------------------------------------------------

# 20. Success Metrics

PR 자동 생성 성공률

80%

테스트 자동 생성률

70%

개발 생산성

+30%

------------------------------------------------------------------------

# 21. Example Usage

User

create billing microservice

Agent

1 analyze repo 2 design architecture 3 generate service 4 add tests 5
run tests 6 create PR 7 merge 8 release

------------------------------------------------------------------------

END
