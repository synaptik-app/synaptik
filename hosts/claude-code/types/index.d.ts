// SPIKE — throwaway. State the spike's drawings read.

export type SpikeMark = 'accept' | 'reject' | 'comment'

declare module 'claude-code' {
  interface PluginState {
    synaptik: {
      isOn: boolean
      isWorking: boolean
      lastText: string
      selected: number
      marks: Record<number, SpikeMark>
      comments: Record<number, string>
      isCommenting: boolean
      focusedVerb: string
      isPaneShown: boolean
      commentSeed: string
      commentSeq: number
    }
  }
}
