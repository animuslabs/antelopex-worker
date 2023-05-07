// generated by @greymass/abi2core

import {
  Asset,
  Checksum256,
  ExtendedAsset,
  Int64,
  Name,
  Struct,
  TimePointSec,
  UInt32,
  UInt64
} from "@greymass/eosio"

@Struct.type("Config")
export class Config extends Struct {
  @Struct.field(ExtendedAsset) min_fee!:ExtendedAsset
}

@Struct.type("IbcOrder")
export class IbcOrder extends Struct {
  @Struct.field(UInt64) id!:UInt64
  @Struct.field(Name) depositor!:Name
  @Struct.field(TimePointSec) deposited_time!:TimePointSec
  @Struct.field(Int64) fee_paid!:Int64
  @Struct.field(Checksum256) trxid!:Checksum256
  @Struct.field(UInt32) block_num!:UInt32
}

@Struct.type("clearconfig")
export class Clearconfig extends Struct {
}

@Struct.type("rmorder")
export class Rmorder extends Struct {
  @Struct.field(UInt64) order_id!:UInt64
}

@Struct.type("setconfig")
export class Setconfig extends Struct {
  @Struct.field(Config) config!:Config
}
