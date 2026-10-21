// The $.state contract: what the hooks keep, and the drawings read.

export type Mark = 'accept' | 'reject' | 'comment'

declare module 'claude-code' {
  interface PluginState {
    synaptik: {
      isOn: boolean
      isWorking: boolean
      lastText: string
      selected: number
      marks: Record<number, Mark>
      comments: Record<number, string>
      isCommenting: boolean
      focusedVerb: string
      isPaneShown: boolean
      commentSeed: string
      commentSeq: number
    }
  }
}
