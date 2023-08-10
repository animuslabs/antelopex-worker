import { Action, Asset, Checksum256, NameType } from "@greymass/eosio"
import fs from "fs-extra"
import { actions } from "lib/actions"
import { ChainClient, getChainClient } from "lib/eosio"
import { getHypClient } from "lib/hyp"
import { IBCTokens, getIBCToken } from "lib/ibcTokens"
import { Lastproof } from "lib/types/ibc.prove.types"
import { ActionReceipt, ChainKey } from "lib/types/ibc.types"
import { throwErr } from "lib/utils"
import WebSocket from "ws"
export interface Chains {from:ChainClient, to:ChainClient}
export interface ProofQuery {block_to_prove:number, last_proven_block?:number, action_receipt_digest?:number, type:string, action_receipt:ActionReceipt}
export interface GetProofQuery { type:string, sym:keyof IBCTokens, block_to_prove:number, action?:any, last_proven_block?:number, action_receipt_digest:any, root?:any }


export async function getLastProvenBlockRow(chain:Chains):Promise<Lastproof> {
  let scope:string = chain.from.config.chain
  if (chain.from.config.chain == "telos") scope = "tlos"
  const rows = await chain.to.getTableRows({ reverse: true, code: chain.to.config.contracts.bridge, scope, table: "lastproofs", limit: 1, type: Lastproof })
  const row = rows[0]
  if (!row) throwErr(`No lastproved record found in table ${chain.from.config.chain}`)
  return row
}

export async function getIsNative(sym:Asset.Symbol, fromChain:ChainClient) {
  const symbol = Asset.Symbol.from(sym)
  const row = await getIBCToken(fromChain, symbol)
  return row.native_chain.toString() === fromChain.config.chain
}

export async function getToChain(sym:Asset.Symbol, account:string, fromChain:ChainClient):Promise<ChainClient> {
  const symbol = Asset.Symbol.from(sym)
  const row = await getIBCToken(fromChain, symbol)
  if (row.token_contract.toString() === account) return getChainClient(row.native_chain.toString() as ChainKey)
  else {
    const wraplock = row.wraplock_contracts.find(w => w.contract.toString() === account)
    if (!wraplock) throwErr("can't find wraplock contract for : " + sym.toString())
    return getChainClient(wraplock.destination_chain.toString() as ChainKey)
  }
}

export async function getActionBlockData(fromChain:ChainClient, tx_id:string, action_name:string, light_proof = false, toChain?:ChainClient):Promise<{sym?:keyof IBCTokens, data:{block_to_prove:number, last_proven_block?:number, root?:Checksum256}}> {
  const trx = await getHypClient(fromChain.config.chain).getTrx(tx_id)
  if (!trx) throwErr(`Transaction not found in ${fromChain.config.chain}: ${tx_id}`)
  const act = trx.actions.find(a => a.act.name == action_name)

  if (!act) throwErr(`Could not find action ${action_name}`)

  const actData = act.act.data as any
  const quantityString:string = actData.xfer.quantity.quantity
  const sym = Asset.from(quantityString).symbol

  const data:any = { block_to_prove: act.block_num }
  if (light_proof) {
    if (!toChain) toChain = await getToChain(sym, act.act.account, fromChain)
    const row = await getLastProvenBlockRow({ from: fromChain, to: toChain })
    data.last_proven_block = row.block_height.toNumber()
    data.root = row.block_merkle_root.toString()
  }

  if (!quantityString) throwErr("Could not find quantity: " + JSON.stringify(actData, null, 2))
  let returnData = { data } as any
  if (sym) returnData.sym = sym
  return returnData
}

export async function getProof(chain:ChainClient, queryData:GetProofQuery) {
  return new Promise((resolve, reject) => {
    //initialize socket to proof server
    const ws = new WebSocket(chain.getProofSocket())

    ws.addEventListener("open", (event) => {
      // connected to websocket server
      const query:Partial<ProofQuery> = { type: queryData.type, block_to_prove: queryData.block_to_prove }
      if (queryData.type === "lightProof") query.last_proven_block = queryData.last_proven_block
      if (queryData.action_receipt_digest) query.action_receipt_digest = queryData.action_receipt_digest
      if (queryData.action) {
        query.action_receipt = queryData.action.receipt as any
        let auth_sequence = []
        for (let authSequence of query.action_receipt?.auth_sequence as any) auth_sequence.push(Object.values(authSequence))
        if (query.action_receipt) query.action_receipt.auth_sequence = auth_sequence
      }

      // console.log("Query:", JSON.stringify(query, null, 2))
      ws.send(JSON.stringify(query))
    })

    //messages from websocket server
    ws.addEventListener("message", (event:any) => {
      const res = JSON.parse(event.data)
      //log non-progress messages from ibc server
      // if (res.type !== "progress") console.log("Received message from ibc proof server", res)
      if (res.type === "error") reject(new Error(res.error))
      if (res.type !== "proof") return
      ws.close()
      resolve(res)
    })
  })
}
type ActionType = keyof typeof actions
// export type ActionType = "lockToken" | "wrapToken"

export function findActionType(contractName:string):{ type:ActionType, destinationChain:ChainClient } {
  let type:ActionType
  if (contractName.includes("wl.")) type = "wrapToken"
  else type = "lockToken"
  return {
    destinationChain: getToChain(contractName),
    type
  }
}

export async function makeProofAction(chain:ChainClient, requestData:GetProofQuery, proofData:any, lightProof = false):Promise<{toChain:ChainClient, action:Action}> {
  const sym = requestData.sym
  const actionData = {
    account: requestData.action.account,
    name: requestData.action.name,
    authorization: requestData.action.authorization,
    data: requestData.action.data
  }
  const type = findActionType(actionData.account)

  let auth_sequence = []
  for (let authSequence of requestData.action.receipt.auth_sequence) auth_sequence.push({ account: authSequence[0], sequence: authSequence[1] })
  requestData.action.receipt.auth_sequence = auth_sequence

  let data = { ...proofData.proof }
  data.actionproof = {
    ...proofData.proof.actionproof,
    action: actionData,
    receipt: { ...requestData.action.receipt }
  }
  if (requestData.root) actionData.data.blockproof.root = requestData.root
  let act:Action = Action.prototype
  const ibcToken = getIBCToken(type.destinationChain, sym)
  let native = ibcToken.nativeChain == chain.config.chain
  const contract = !native ? ibcToken.wraplockContract[type.destinationChain.config.chain] : ibcToken.tokenContract[type.destinationChain.config.chain]
  console.log("ibctkn:", ibcToken)
  console.log("native:", native)
  console.log("action contract:", contract)
  console.log("destination:", type.destinationChain.config.chain)

  if (!contract) throwErr(`could not find contract for symbol: ${sym} chain: ${chain.config.chain}`)
  if (!lightProof) {
    if (type.type === "wrapToken") act = actions.wrapToken.issueA(data, contract, type.destinationChain.config.chain)
    else if (type.type === "lockToken") act = actions.lockToken.withdrawA(data, contract, type.destinationChain.config.chain)
  } else {
    if (type.type === "wrapToken") act = actions.wrapToken.issueB(data, contract, type.destinationChain.config.chain)
    else if (type.type === "lockToken") act = actions.lockToken.withdrawB(data, contract, type.destinationChain.config.chain)
  }
  fs.writeJsonSync("../action.json", { data, contract, destination: type.destinationChain.config.chain }, { spaces: 2 })
  return { toChain: type.destinationChain, action: act }
}

export async function getProveActionData(chain:ChainClient, request_data:any, proof_data:any, light_proof = false) {
  console.log("request_data", request_data)

  const actionData = {
    authorization: [{
      actor: chain.config.worker.account,
      permission: chain.config.worker.permission
    }],
    name: "prove",
    account: chain.config.contracts.bridge,
    data: { ...proof_data.proof, prover: chain.config.worker.account }
  }

  let auth_sequence = []
  for (let authSequence of request_data.action.receipt.auth_sequence) auth_sequence.push({ account: authSequence[0], sequence: authSequence[1] })
  // for (let authSequence of request_data.action.receipt.auth_sequence) auth_sequence.push(Object.values(authSequence))
  request_data.action.receipt.auth_sequence = auth_sequence

  actionData.data.actionproof = {
    ...proof_data.proof.actionproof,
    action: {
      account: request_data.action.account,
      name: request_data.action.name,
      authorization: request_data.action.authorization,
      data: request_data.action.data
    },
    receipt: { ...request_data.action.receipt }
  }
  if (request_data.root) actionData.data.blockproof.root = request_data.root

  return actionData
}

export async function getProofRequestData(fromChain:ChainClient, tx_id:string, action_name:string, receiver?:string, type = "heavyProof"):Promise<GetProofQuery> {
  const block_data = await getActionBlockData(fromChain, tx_id, action_name, (type === "lightProof"))
  let sym = block_data.sym
  let nativeToken = ibcTokens[sym].nativeChain === fromChain.config.chain
  if (!sym) throwErr("missing sym: " + tx_id)

  if (!receiver && !nativeToken) receiver = ibcTokens[sym].tokenContract[fromChain.config.chain]
  console.log("sym", sym)
  console.log("native", nativeToken)
  console.log("receiver", receiver)

  if (!block_data.data.block_to_prove) throwErr("missing block_to_prove")
  return new Promise((resolve, reject) => {
    //initialize socket to proof server
    const ws = new WebSocket(fromChain.getProofSocket())

    ws.addEventListener("open", async(event) => {
      // connected to websocket server
      const query = { type: "getBlockActions", block_to_prove: block_data.data.block_to_prove }
      ws.send(JSON.stringify(query))
    })

    ws.addEventListener("error", (event) => {
      console.error(`WebSocket error: ${event.message}`)
    })
    // let potentialReceivers:string[] = []
    // if (!receiver) {
    //   Object.entries(ibcTokens).forEach(tok => {
    //     const tkn = tok[1].tokenContract[fromChain.config.chain]
    //     if (tkn) potentialReceivers.push(tkn)
    //     const wl = tok[1].wraplockContract[fromChain.config.chain]
    //     if (wl) potentialReceivers.push(wl)
    //   })
    // }


    //messages from websocket server
    ws.addEventListener("message", (event:any) => {
      const res = JSON.parse(event.data)
      //log non-progress messages from ibc server
      // if (res.type !== "progress") console.log("Received message from ibc getBlockActions", res)
      if (res.type === "error") reject(res.error)
      if (res.type !== "getBlockActions") return
      ws.close()
      const action_receipt = res.txs.filter((t:any) => {
        return t[0].transactionId === tx_id
      })
      const action_data = action_receipt[0].find((a:any) => {
        if (receiver) return a.receiver === receiver && a.action.name == action_name
        else {
          console.log("actionName:", a.action.name)
          console.log("receiver: ", a.receiver)
          let receivers = Object.values(ibcTokens[sym].wraplockContract)
          if (a.action.name == action_name && receivers.includes(a.receiver)) {
            return true
          }
          return false
        }
      })
      if (!action_data) throwErr(`Action ${action_name} and receiver ${receiver} not found `)
      // console.log("action data ", JSON.stringify(action_data, null, 2))
      const action = action_data.action
      action.receipt = action_data.receipt
      const action_receipt_digest = action_data.action_receipt_digest

      resolve({ type, action, action_receipt_digest, ...block_data.data, sym })
    })
  })
}


export async function proveTransfer() {

}

