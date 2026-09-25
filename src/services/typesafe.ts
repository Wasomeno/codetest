import { TypeSafeClient } from '@typesafe-ai/sdk'

const apiKey =
  typeof process !== 'undefined' && process.env?.TYPESAFE_API_KEY
    ? process.env.TYPESAFE_API_KEY
    : (import.meta as any).env?.VITE_TYPESAFE_API_KEY

export const typesafe = new TypeSafeClient({
  apiKey,
})

export { choice, noul, score } from '@typesafe-ai/sdk'
