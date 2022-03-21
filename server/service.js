import fs from 'fs'
import fsPromises from 'fs/promises'
import { randomUUID } from 'crypto'
import { PassThrough } from 'stream'
import Throttle from 'throttle'
import { ChildProcess } from 'child_process'

import config from './config.js'
import { join, extname } from 'path'
import { logger } from './util.js'

const {
  dir: {
    publicDirectory
  },
  constants: {
    fallbackBitRate,
    englishConversation,
    bitRateDivisor
  }
} = config

export class Service {
  constructor() {
    this.clientStreams = new Map()
    this.currentSong = englishConversation
    this.currentBitRate = 0
  }

  createClientStream() {
    const id = randomUUID()
    const clientStream = new PassThrough()
    this.clientStreams.set(id, clientStream)

    return {
      id,
      clientStream
    }
  }

  removeClientStream(id) {
    this.clientStreams.delete(id)
  }

  _executeSoxCommand(args) {
    return ChildProcess.spawn('sox', args)
  }

  async getBitRate(song) {
    try {
      const args = [
        '--i',
        '-B',
        song
      ]
      const {
        stderr,
        stdout,
        stdin
      } = this._executeSoxCommand(args)

      const [success, error] = [stdout, stderr].map(stream => stream.read())
      if(error) return await Promise.reject(error)

      return success
      .toString()
      .trim()
      .replace(/k/, '000')
    } catch (error) {
      logger.error(`deu ruim no bitrate: ${error}`)
      return fallbackBitRate
    }
  }

  async startStream() {
    logger.info(`starting with ${this.currentSong}`)
    const bitRate = this.currentBitRate = await this.getBitRate(this.currentSong)
    const throttleTransform = new Throttle(bitRate)
    const songReadable = this.createFileStream(this.currentSong)

  }

  createFileStream(filename) {
    return fs.createReadStream(filename)
  }

  async getFileInfo(filename) {
    const fullFilePath = join(publicDirectory, filename)
    
    await fsPromises.access(fullFilePath)
    const fileType = extname(fullFilePath)

    return {
      type: fileType,
      name: fullFilePath
    }
  }

  async getFileStream(filename) {
    const {
      name,
      type
    } = await this.getFileInfo(filename)
    return {
      stream: this.createFileStream(name),
      type
    }
  }
}
