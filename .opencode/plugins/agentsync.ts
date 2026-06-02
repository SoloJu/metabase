import type { Plugin } from "@opencode-ai/plugin"
import type { Part } from "@opencode-ai/sdk"
import { appendFileSync, mkdirSync } from "fs"
import { join } from "path"

type TextPart = Extract<Part, { type: "text" }>

// AgentSync plugin for Opencode — appends each assistant response to .agentsync/collab.md.
// Place this file in .opencode/plugins/ in the target project root.

export const AgentSyncPlugin: Plugin = async ({ client, directory }) => {
  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle") return

      const sessionID = (event.properties as { sessionID: string }).sessionID

      const result = await client.session.messages({ path: { id: sessionID } })
      const messages = result.data ?? []

      // TODO 这里需要修改一下, 使用中发现, Opencode 把处理过程中的 subagent 的反馈, 也添加到 collab.md 中, 用户只需要主 Agent 的反馈;
      // Last non-summary assistant message in this session turn
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.info.role === "assistant" && !m.info.summary)

      if (!lastAssistant) return

      const text = lastAssistant.parts
        .filter((p): p is TextPart => p.type === "text")
        .filter((p) => !p.synthetic && !p.ignored)
        .map((p) => p.text)
        .join("")
        .trim()

      if (!text) return

      const collabFile = process.env.AGENTSYNC_COLLAB ?? "collab.md"
      const agentsyncDir = join(directory, ".agentsync")
      const collabPath = join(agentsyncDir, collabFile)

      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, "0")
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

      mkdirSync(agentsyncDir, { recursive: true })
      appendFileSync(collabPath, `\n---\nOpencode: [${timestamp}]\n${text}\n`)
    },
  }
}
