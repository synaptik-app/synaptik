// The $.state contract: what the hooks keep, and the drawings read.

export type Mark = 'accept' | 'reject' | 'comment'

declare module 'claude-code' {
  interface PluginState {
    synaptik: {
      isOn: boolean
      isWorking: boolean
      lastText: string
      selected: number
      // By part: a block's index, or a code line's key (src/blocks.ts).
      marks: Record<string, Mark>
      comments: Record<string, string>
      isCommenting: boolean
      focusedVerb: string
      isPaneShown: boolean
      commentSeed: string
      commentSeq: number
    }
  }
}
