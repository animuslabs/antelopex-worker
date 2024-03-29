import { Action } from "@greymass/eosio"
import { HypAction } from "lib/hyp"
import { ibcSymbols } from "lib/ibcTokens"
export const chainNames = ["tlos", "eos", "ux", "wax"] as const
export type ChainKey = typeof chainNames[number]

export type IbcSymbols = typeof ibcSymbols[number]
// export type SymbolsObject = {
//   [K in typeof ibcSymbols[number]]:K;
// };
export type FilteredSymbol = typeof ibcSymbols[number];

// export type FilteredTokens = Partial<typeof ibcTokens>

export interface IbcToken {
  nativeChain:ChainKey
  precision:number
  img?:string
  tokenContract:Partial<Record<ChainKey, string>>
  wraplockContract:Partial<Record<ChainKey, string>>
}

export interface ProofData {
  blockproof:BlockProof;
  actionproof?:ActionProof;
}

interface BlockProof {
  chain_id:string;
  blocktoprove:BlockToProve;
  bftproof:BFTProof[];
  hashes:string[];
}

interface BlockToProve {
  block:Block;
  active_nodes:number[];
  node_count:number;
}

interface Block {
  header:Header;
  producer_signatures:string[];
  previous_bmroot:string;
  id:string;
  bmproofpath:number[];
}

interface Header {
  timestamp:string;
  producer:string;
  previous:string;
  transaction_mroot:string;
  action_mroot:string;
  confirmed:number;
  schedule_version:number;
  new_producers:null;
  header_extensions:any[];
}

interface BFTProof {
  header:Header;
  producer_signatures:string[];
  previous_bmroot:string;
  bmproofpath:number[];
}

export interface ActionProof {
  amproofpath:string[];
  returnvalue:string;
}


export interface ProofDataResult {
  type:string;
  query:{
    type:string;
    block_to_prove:number;
  };
  proof:ProofData


}

export interface ActionReceipt {
  abi_sequence:string,
  act_digest:string,
  auth_sequence:any[],
  code_sequence:string,
  global_sequence:string,
  receiver:string,
  recv_sequence:string
}

export type ProofRequestType = "heavyProof" | "lightProof"
export const ibcActionNames = ["emitxfer", "emitnftxfer", "nftidxfer", "emitschema", "emittemplate"] as const
export type IBCActionNames = typeof ibcActionNames[number]
export type IBCAction = Omit<Action, "name"> & {name:IBCActionNames}

export interface TrxDetails {actions:HypAction<unknown>[], blockNum:number, txid:string}

export interface XferType {owner:string, quantity:{quantity:string, contract:string}, beneficiary:string}
export interface EmitXferAction { data:{ xfer:XferType }, account:string, authorization:{actor:string, premission:string}[] }
export interface GetProofQuery { block_to_prove:number, action:Action, actionName:IBCActionNames, action_receipt_digest:string, actionReceipt:ActionReceipt}
export interface ProofQuery {block_to_prove:number, last_proven_block?:number, type:ProofRequestType, action_receipt:ActionReceipt, action_receipt_digest?:string}

