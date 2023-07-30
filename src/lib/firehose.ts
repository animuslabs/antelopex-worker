
import protoLoader from "@grpc/proto-loader"
import grpc from "@grpc/grpc-js"
import path from "path"
import ProtoBuf from "protobufjs"
import { ChainKey } from "lib/types/ibc.types"
import { EosioConfig, getConfig } from "lib/env"
import { sleep } from "lib/utils"
import WebSocket from "ws"

import { fileURLToPath } from "url"
import { BlockData } from "lib/types/firehoseTypes"
const runningStreams = []
const grpcAddress = process.env.GRPC_ADDRESS

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const loadProto = (pkg:string) => ProtoBuf.loadSync(path.resolve("..", "proto", pkg))
const eosioProto = loadProto("dfuse/eosio/codec/v1/codec.proto")
const eosioBlockMsg = eosioProto.root.lookupType("dfuse.eosio.codec.v1.Block")
// ["STEP_IRREVERSIBLE"]

export interface GetBlockQuery {
  firehoseOptions:{
    start_block_num:number
    stop_block_num:number,
    include_filter_expr:string,
    fork_steps:string[],
  }
  retries?:number
  ws?:WebSocket
}

interface GetBlockResponse {
  block:BlockData,
  step:any
}



function loadGrpcPackageDefinition(pkg:string) {
  const proto = protoLoader.loadSync(
    path.resolve("..", "proto", pkg),
    { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
  )
  return grpc.loadPackageDefinition(proto)
}

const bstreamService = loadGrpcPackageDefinition("dfuse/bstream/v1/bstream.proto")


export class FirehoseClient {
  constructor(chain:ChainKey) {
    this.config = getConfig(chain)

    // if (firehoseSocket?.includes("wss://")) secure = true
    this.client = this.reconnect()
  }

  config:EosioConfig
  client:any

  reconnect() {
    const streamService = bstreamService.dfuse as any
    const firehoseSocket = this.config.firehoseSockets[0]
    if (!firehoseSocket) throw new Error("Firehose socket not found for chain: " + this.config.chain)
    let secure:boolean = false

    const client = new streamService.bstream.v1.BlockStreamV2(
      firehoseSocket,
      secure ? grpc.credentials.createSsl() : grpc.credentials.createInsecure(), {
        "grpc.max_receive_message_length": 1024 * 1024 * 100,
        "grpc.max_send_message_length": 1024 * 1024 * 100,
        "grpc.enable_retries": true
      }
    )
    return client
  }

  getFirehoseBlock(req:GetBlockQuery):Promise<GetBlockResponse> {
    return new Promise((resolve, reject) => {
      if (!req.retries && req.retries !== 0) req.retries = 10
      const client = this.client
      let stream = client.Blocks(req.firehoseOptions)

      stream.on("data", (data:any) => {
        const { block: rawBlock } = data
        const block = eosioBlockMsg.decode(rawBlock.value)
        // client.close()
        resolve({ block: JSON.parse(JSON.stringify(block, null, "  ")), step: data.step })
      })
      stream.on("error", async(error:any) => {
        client.close()
        if (error.code === grpc.status.CANCELLED) console.log("stream manually cancelled")
        else {
          if (req.retries) {
            console.log("req.retries", req.retries)
            await sleep((11 - req.retries) * 0.1)
            req.retries--
            this.reconnect()
            resolve(await this.getFirehoseBlock(req))
          } else {
            console.log("Error in get block", error)
            console.log({ ...req, ws: null })
            if (req.ws) req.ws.send(JSON.stringify({ type: "error", error: "Could not stream block from firehose" }))
          }
        }
      })
    })
  }
}


