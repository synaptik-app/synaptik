// The $.state contract: what the hooks keep, and the drawings read.

export type Mark = 'accept' | 'reject' | 'comment'
export type SelectionMark = { text: string; block: number; mark: Mark; comment?: string }

declare module 'claude-code' {
  interface PluginState {
    synaptik: {
      isOn: boolean
      isWorking: boolean
      lastText: string
      selected: number
      marks: Record<number, Mark>
      comments: Record<number, string>
      selections: SelectionMark[]
      isCommenting: boolean
      focusedVerb: string
      isPaneShown: boolean
      commentSeed: string
      commentSeq: number
    }
  }
}
