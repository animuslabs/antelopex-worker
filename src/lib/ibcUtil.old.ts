import { API, Action, Asset, PermissionLevel, UInt32Type } from "@greymass/eosio"
import { getConfig } from "lib/env"
import { ChainClient, getChainClient } from "lib/eosio"
import { ibcTokens } from "lib/ibcTokens"
import logger from "lib/logger"
import { ActionTrace } from "lib/types/firehoseTypes"
import { Checkproofd, Lastproof } from "lib/types/ibc.prove.types"
import { ActionReceipt, ChainKey, IbcToken, ProofData, ProofDataResult } from "lib/types/ibc.types"
import { Emitxfer, Withdrawa } from "lib/types/wraplock.types"
import { Issuea } from "lib/types/wraptoken.types"
import WebSocket from "ws"
const log = logger.getLogger("ibcUtil")


export function getIbcToken(symbol:Asset.Symbol):IbcToken {
  const tkn = Object.entries(ibcTokens).find(tkn => tkn[0] === symbol.name)
  if (!tkn) throw new Error(`No token found for symbol ${symbol.name} `)
  return tkn[1]
}


export async function getProducerScheduleBlock(blocknum:number, fromClient:ChainClient, toClient:ChainClient):Promise<number | null> {
  try {
    let header = await fromClient.getBlock(blocknum)
    let target_schedule = header.schedule_version
    let min_block = 2

    const lastBlockProved = (await toClient.getTableRows({
      code: toClient.config.contracts.bridge, //destinationChain.bridgeContract,
      table: "lastproofs",
      scope: fromClient.config.chain,
      limit: 1,
      reverse: true,
      show_payer: false,
      type: Lastproof
    }))
    const lastBlockRow = lastBlockProved[0]
    if (lastBlockRow) min_block = lastBlockRow.block_height.toNumber()
    let max_block = blocknum

    // Binary search for the active schedule change
    while (max_block - min_block > 1) {
      blocknum = Math.round((max_block + min_block) / 2)
      try {
        header = await fromClient.getBlock(blocknum)
        if (header.schedule_version < target_schedule) min_block = blocknum
        else max_block = blocknum
      } catch (ex) { }
    }
    if (blocknum > 337) blocknum -= 337

    // Search for the new_producer_schedule in the block header
    while (blocknum < max_block && (!("new_producer_schedule" in header) && !header.new_producers)) {
      try {
        header = await fromClient.getBlock(blocknum)
        blocknum++
      } catch (ex) { }
    }
    blocknum = header.block_num.toNumber()
    return blocknum
  } catch (ex) {
    console.error(ex)
    return null
  }
}

export async function getScheduleProofs(fromChain:ChainKey, toChain:ChainKey, trxBlock:UInt32Type):Promise<ProofData[]> {
  const fromClient = getChainClient(fromChain)
  const toClient = getChainClient(toChain)
  // This function searches for the block number with a specific producer schedule

  const proofs:ProofData[] = []
  let scope:string = fromChain
  if (fromChain === "telos") scope = "tlos"


  const getScheduleParams = {
    code: toClient.config.contracts.bridge,
    table: "schedules",
    scope,
    limit: 1,
    reverse: true,
    show_payer: false,
    json: true
  }

  // Retrieve the last proven schedule version
  const bridgeScheduleData = (await toClient.getTableRowsJson(getScheduleParams))
  const scheduleData = bridgeScheduleData[0]
  if (!scheduleData) throw new Error("scheduleData not found")
  log.info("schedulData:", JSON.parse(JSON.stringify(scheduleData)))


  let last_proven_schedule_version = 0
  last_proven_schedule_version = scheduleData.version
  if (!last_proven_schedule_version) return []
  let schedule = await fromClient.getProducerSchedule()
  // log.info(schedule)
  let schedule_version = schedule.active.version
  let head = (await fromClient.getInfo()).head_block_num.toNumber()
  let schedule_block = head

  // Prove the active schedules
  log.info("should prove active schedule", schedule_version > last_proven_schedule_version, schedule_version, last_proven_schedule_version)
  while (schedule_version > last_proven_schedule_version) {
    let block_num = await getProducerScheduleBlock(schedule_block, fromClient, toClient)
    if (!block_num) return []
    let proof = await getProof(block_num, fromClient, toClient)
    if (!proof) throw new Error("get proof error")
    schedule_version = proof.blockproof.blocktoprove.block.header.schedule_version
    schedule_block = block_num
    proofs.unshift(proof)
  }

  // Check for a pending schedule and prove it if found
  if (schedule.pending) {
    let newPendingBlockHeader:API.v1.GetBlockResponse|null = null
    let currentBlock = trxBlock + 0
    while (!newPendingBlockHeader) {
      let bHeader = (await fromClient.getBlock(currentBlock))
      if (bHeader.new_producers) newPendingBlockHeader = bHeader
      else currentBlock--
    }
    let pendingProof = await getProof(newPendingBlockHeader.block_num.toNumber(), fromClient, toClient)
    if (!pendingProof) throw new Error("get proof error")
    proofs.push(pendingProof)
  }

  return proofs
}

export const getProof = async(blockNum:number, fromClient:ChainClient, toClient:ChainClient, action_receipt:ActionReceipt|null = null, type:string = "heavyProof"):Promise<ProofData|null> => {
  return new Promise((resolve) => {
    //initialize socket to proof server
    const ws = new WebSocket(fromClient.getProofSocket())

    const onMessage = async(event:any) => {
      const res = JSON.parse(event.data)

      //log non-progress messages from ibc server
      // if (res.type !== "progress") log.info("Received message from ibc proof server", res)
      if (res.type === "progress") log.info("Progress:", res.progress + "%")
      if (res.type === "error") {
        log.error("Proof Server Error:", res.error)
        ws.close()
        resolve(null)
      }
      if (res.type !== "proof") return
      ws.close()
      let proofResult = res as ProofDataResult
      // log.info("got proof full result:", proofResult)
      resolve(proofResult.proof)
    }

    ws.addEventListener("message", onMessage)

    ws.addEventListener("open", (event) => {
      log.info("Connected to ibc proof server")
      const query = { type, block_to_prove: blockNum } as any
      if (action_receipt) query.action_receipt = action_receipt
      console.log("QUERY:", JSON.stringify(query, null, 2))
      ws.send(JSON.stringify(query))
    })
  })
}

export function makeBridgeProofAction(proof:ProofData, fromChain:ChainKey, toChain:ChainKey):Action {
  const fromConf = getConfig(fromChain)
  const toConf = getConfig(toChain)
  const authorization = [PermissionLevel.from({ actor: toConf.worker.account, permission: toConf.worker.permission })]
  const action = Action.from({
    account: toConf.contracts.bridge,
    authorization,
    data: Checkproofd.from({ ...proof }),
    name: "checkproofd"

  })
  return action
}

export function makeTransferProofAction(provingAction:ActionTrace, proof:ProofData, ibcToken:IbcToken, fromChain:ChainKey, toChain:ChainKey):Action {
  const fromConf = getConfig(fromChain)
  const toConf = getConfig(toChain)
  const authorization = [PermissionLevel.from({ actor: toConf.worker.account, permission: toConf.worker.permission })]
  const isNative = ibcToken.nativeChain === fromChain
  const account = isNative ? ibcToken.foreignWraplockContract[toChain] : ibcToken.nativeWraplockContract[toChain]
  if (!account) throw new Error("account not found")

  const name = isNative ? "issuea" : "withdrawa"


  const emitXferAct = Action.from({
    name: "emitxfer",
    account: "dfdf",
    authorization: [],
    data: Emitxfer.from(JSON.parse(provingAction.action.jsonData))
  })

  log.info("generated emitXfer action here")


  let finalProof:any = Object.assign({}, proof)
  if (!finalProof.actionproof) throw new Error("actionproof not found")
  finalProof.actionproof.action = {
    account: provingAction.action.account,
    name: provingAction.action.name,
    authorization: provingAction.action.authorization,
    data: emitXferAct.data.hexString
  }



  let auth_sequence:any[] = []
  for (let authSequence of provingAction.receipt.authSequence) auth_sequence.push({ account: authSequence.accountName, sequence: authSequence.sequence })
  finalProof.actionproof.receipt = { ...provingAction.receipt, auth_sequence }

  let p = finalProof.actionproof.receipt
  log.info("actionproof", finalProof.actionproof)
  log.info("receipt", p)
  let modifiedReceipt = {
    receiver: p.receiver,
    act_digest: p.digest,
    global_sequence: p.globalSequence,
    recv_sequence: p.recvSequence,
    auth_sequence: p.authSequence.map((el:any) => ({ account: el.accountName, sequence: el.sequence })),
    code_sequence: p.codeSequence,
    abi_sequence: p.abiSequence
  }
  finalProof.actionproof.receipt = modifiedReceipt

  console.log("modifiedReceipt", modifiedReceipt)
  console.log("modifiedReceipt auth_sequence", modifiedReceipt.auth_sequence)

  const params = { ...finalProof, prover: toConf.worker.account }
  // log.info("PARAMS:", JSON.stringify(params, null, 2))
  const data = isNative ? Issuea.from(params) : Withdrawa.from(params)
  const action = Action.from({
    account,
    authorization,
    name,
    data
  })
  log.info("ISSUE ACTION", JSON.stringify(action.decodeData(Issuea), null, 2))
  return action
}

// console.log("Progress: 100%")

// // TODO finish isNative logic
// let isNative = true
// const fromWorker = fromClient.config.worker
// //handle issue/withdraw if proving transfer/retire 's emitxfer action, else submit block proof to bridge directly (for schedules)
// let actionToSubmit:Action


// let params = { ...res.proof, prover: toClient.config.worker.account }

// if (action) {
//   let auth_sequence:any[] = []
//   for (let authSequence of action.receipt.auth_sequence) auth_sequence.push({ account: authSequence[0], sequence: authSequence[1] })
//   params.actionproof = {
//     ...res.proof.actionproof,
//     action: {
//       account: action.act.account,
//       name: action.act.name,
//       authorization: action.act.authorization,
//       data: action.act.hex_data
//     },
//     receipt: { ...action.receipt, auth_sequence }
//   }
//   actionToSubmit = Action.from({
//     account: actionAcct,
//     data: isNative ? Issuea.from(params) : Withdrawa.from(params),
//     name: isNative ? "issuea" : "withdrawa",
//     authorization: [PermissionLevel.from({ actor: fromWorker.account, permission: fromWorker.permission })]
//   })
// } else {
//   actionToSubmit = Action.from({
//     account: actionAcct,
//     data: Checkproofd.from({ ...res.proof }),
//     name: "checkproofd",
//     authorization: [PermissionLevel.from({ actor: fromWorker.account, permission: fromWorker.permission })]
//   })
// }

//   name: !action ? "checkproofd" : tokenRow.native ? "issuea" : "withdrawa",
//   account: !action ? destinationChain.bridgeContract : tokenRow.native ? tokenRow.pairedWrapTokenContract : tokenRow.wrapLockContract,
//   data: { ...res.proof, prover: destinationChain.auth.actor }
// }

//if proving an action, add action and formatted receipt to actionproof object




// const actionToSubmit = {
//         authorization: [destinationChain.auth],
//         name: !action ? "checkproofd" : tokenRow.native ? "issuea" : "withdrawa",
//         account: !action ? destinationChain.bridgeContract : tokenRow.native ? tokenRow.pairedWrapTokenContract : tokenRow.wrapLockContract,
//         data: { ...res.proof, prover: destinationChain.auth.actor }
//       };

//       //if proving an action, add action and formatted receipt to actionproof object
//       if (action) {
//         let auth_sequence = [];
//         for (var authSequence of action.receipt.auth_sequence) auth_sequence.push({ account: authSequence[0], sequence: authSequence[1] });
//         actionToSubmit.data.actionproof = {
//           ...res.proof.actionproof,
//           action: {
//             account: action.act.account,
//             name: action.act.name,
//             authorization: action.act.authorization,
//             data: action.act.hex_data
//           },
//           receipt: { ...action.receipt, auth_sequence }
//         }
//       }
