export const logger = {
  info(...rest: string[]) {
    console.info(`[INFO] ${rest}`)
  },
  error(...rest: string[]) {
    console.error(`[ERROR]: ${rest}`)
  }
}
