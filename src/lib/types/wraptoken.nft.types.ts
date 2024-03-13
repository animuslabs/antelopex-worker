import type {
  Action,
  BytesType,
  Checksum256Type,
  Int32Type,
  NameType,
  PublicKeyType,
  SignatureType,
  UInt16Type,
  UInt32Type,
  UInt64Type,
  VarUIntType
} from "@wharfkit/antelope"
import {
  ABI,
  Asset,
  Blob,
  BlockTimestamp,
  Bytes,
  Checksum256,
  Float32,
  Float64,
  Int16,
  Int32,
  Int64,
  Int8,
  Name,
  PublicKey,
  Signature,
  Struct,
  UInt16,
  UInt32,
  UInt64,
  UInt8,
  VarUInt,
  Variant
} from "@wharfkit/antelope"
import type { ActionOptions, ContractArgs, PartialBy, Table } from "@wharfkit/contract"
import { Contract as BaseContract } from "@wharfkit/contract"
export const abiBlob = Blob.from(
  "DmVvc2lvOjphYmkvMS4yDRBBVE9NSUNfQVRUUklCVVRFwgF2YXJpYW50X2ludDhfaW50MTZfaW50MzJfaW50NjRfdWludDhfdWludDE2X3VpbnQzMl91aW50NjRfZmxvYXQzMl9mbG9hdDY0X3N0cmluZ19JTlQ4X1ZFQ19JTlQxNl9WRUNfSU5UMzJfVkVDX0lOVDY0X1ZFQ19VSU5UOF9WRUNfVUlOVDE2X1ZFQ19VSU5UMzJfVkVDX1VJTlQ2NF9WRUNfRkxPQVRfVkVDX0RPVUJMRV9WRUNfU1RSSU5HX1ZFQw1BVFRSSUJVVEVfTUFQHnBhaXJfc3RyaW5nX0FUT01JQ19BVFRSSUJVVEVbXQpET1VCTEVfVkVDCWZsb2F0NjRbXQlGTE9BVF9WRUMJZmxvYXQzMltdCUlOVDE2X1ZFQwdpbnQxNltdCUlOVDMyX1ZFQwdpbnQzMltdCUlOVDY0X1ZFQwdpbnQ2NFtdCElOVDhfVkVDBWJ5dGVzClNUUklOR19WRUMIc3RyaW5nW10KVUlOVDE2X1ZFQwh1aW50MTZbXQpVSU5UMzJfVkVDCHVpbnQzMltdClVJTlQ2NF9WRUMIdWludDY0W10JVUlOVDhfVkVDBWJ5dGVzKAZhY3Rpb24ABAdhY2NvdW50BG5hbWUEbmFtZQRuYW1lDWF1dGhvcml6YXRpb24ScGVybWlzc2lvbl9sZXZlbFtdBGRhdGEFYnl0ZXMLYWN0aW9ucHJvb2YABAZhY3Rpb24GYWN0aW9uB3JlY2VpcHQKYWN0cmVjZWlwdAtyZXR1cm52YWx1ZQVieXRlcwthbXByb29mcGF0aA1jaGVja3N1bTI1NltdCmFjdHJlY2VpcHQABwhyZWNlaXZlcgRuYW1lCmFjdF9kaWdlc3QLY2hlY2tzdW0yNTYPZ2xvYmFsX3NlcXVlbmNlBnVpbnQ2NA1yZWN2X3NlcXVlbmNlBnVpbnQ2NA1hdXRoX3NlcXVlbmNlCWF1dGhzZXFbXQ1jb2RlX3NlcXVlbmNlCXZhcnVpbnQzMgxhYmlfc2VxdWVuY2UJdmFydWludDMyC2FuY2hvcmJsb2NrAAMFYmxvY2sMc2Jsb2NraGVhZGVyDGFjdGl2ZV9ub2Rlcwh1aW50MTZbXQpub2RlX2NvdW50BnVpbnQ2NAhhc3NldHNfcwAICGFzc2V0X2lkBnVpbnQ2NA9jb2xsZWN0aW9uX25hbWUEbmFtZQtzY2hlbWFfbmFtZQRuYW1lC3RlbXBsYXRlX2lkBWludDMyCXJhbV9wYXllcgRuYW1lDWJhY2tlZF90b2tlbnMHYXNzZXRbXRlpbW11dGFibGVfc2VyaWFsaXplZF9kYXRhBWJ5dGVzF211dGFibGVfc2VyaWFsaXplZF9kYXRhBWJ5dGVzB2F1dGhzZXEAAgdhY2NvdW50BG5hbWUIc2VxdWVuY2UGdWludDY0C2Jsb2NraGVhZGVyAAkJdGltZXN0YW1wFGJsb2NrX3RpbWVzdGFtcF90eXBlCHByb2R1Y2VyBG5hbWUJY29uZmlybWVkBnVpbnQxNghwcmV2aW91cwtjaGVja3N1bTI1NhF0cmFuc2FjdGlvbl9tcm9vdAtjaGVja3N1bTI1NgxhY3Rpb25fbXJvb3QLY2hlY2tzdW0yNTYQc2NoZWR1bGVfdmVyc2lvbgZ1aW50MzINbmV3X3Byb2R1Y2VycxJwcm9kdWNlcl9zY2hlZHVsZT8RaGVhZGVyX2V4dGVuc2lvbnMTcGFpcl91aW50MTZfYnl0ZXNbXQdjYW5jZWxhAAMGcHJvdmVyBG5hbWUKYmxvY2twcm9vZgpoZWF2eXByb29mC2FjdGlvbnByb29mC2FjdGlvbnByb29mB2NhbmNlbGIAAwZwcm92ZXIEbmFtZQpibG9ja3Byb29mCmxpZ2h0cHJvb2YLYWN0aW9ucHJvb2YLYWN0aW9ucHJvb2YHZGlzYWJsZQAADGVtaXRlbXBsYXRlcwAED2NvbGxlY3Rpb25fbmFtZQRuYW1lC3RlbXBsYXRlX2lkBWludDMyC3NjaGVtYV9uYW1lBG5hbWUXdGVtcGxhdGVfaW1tdXRhYmxlX2RhdGENQVRUUklCVVRFX01BUAZlbmFibGUAAAZnbG9iYWwABghjaGFpbl9pZAtjaGVja3N1bTI1Ng9icmlkZ2VfY29udHJhY3QEbmFtZQ9wYWlyZWRfY2hhaW5faWQLY2hlY2tzdW0yNTYYcGFpcmVkX3dyYXBsb2NrX2NvbnRyYWN0BG5hbWUVcGFpcmVkX3Rva2VuX2NvbnRyYWN0BG5hbWUHZW5hYmxlZARib29sCmhlYXZ5cHJvb2YABAhjaGFpbl9pZAtjaGVja3N1bTI1NgZoYXNoZXMNY2hlY2tzdW0yNTZbXQxibG9ja3RvcHJvdmULYW5jaG9yYmxvY2sIYmZ0cHJvb2YOc2Jsb2NraGVhZGVyW10IaHBzdHJ1Y3QAAgJpZAZ1aW50NjQCaHAKaGVhdnlwcm9vZgRpbml0AAQIY2hhaW5faWQLY2hlY2tzdW0yNTYPYnJpZGdlX2NvbnRyYWN0BG5hbWUPcGFpcmVkX2NoYWluX2lkC2NoZWNrc3VtMjU2GHBhaXJlZF93cmFwbG9ja19jb250cmFjdARuYW1lC2luaXRzY2hlbWFhAAMGcHJvdmVyBG5hbWUKYmxvY2twcm9vZgpoZWF2eXByb29mC2FjdGlvbnByb29mC2FjdGlvbnByb29mC2luaXRzY2hlbWFiAAMGcHJvdmVyBG5hbWUKYmxvY2twcm9vZgpsaWdodHByb29mC2FjdGlvbnByb29mC2FjdGlvbnByb29mBmlzc3VlYQADBnByb3ZlcgRuYW1lCmJsb2NrcHJvb2YKaGVhdnlwcm9vZgthY3Rpb25wcm9vZgthY3Rpb25wcm9vZgZpc3N1ZWIAAwZwcm92ZXIEbmFtZQpibG9ja3Byb29mCmxpZ2h0cHJvb2YLYWN0aW9ucHJvb2YLYWN0aW9ucHJvb2YKbGlnaHRwcm9vZgAECGNoYWluX2lkC2NoZWNrc3VtMjU2BmhlYWRlcgtibG9ja2hlYWRlcgRyb290C2NoZWNrc3VtMjU2C2JtcHJvb2ZwYXRoDWNoZWNrc3VtMjU2W10IbHBzdHJ1Y3QAAgJpZAZ1aW50NjQCbHAKbGlnaHRwcm9vZgltZXRhbWFwcm0AARdmb3JlaWduX2NvbGxlY3Rpb25fbmFtZQRuYW1lCm1ldGFtYXBzZXQAAQltYXBfZW50cnkKbmZ0bWV0YW1hcAhuZnRpZG1hcAACDmxvY2FsX2Fzc2V0X2lkBnVpbnQ2NBBmb3JlaWduX2Fzc2V0X2lkBnVpbnQ2NAluZnRpZHhmZXIAAQluZnRpZHhmZXIKbmZ0aWR4ZmVycwpuZnRpZHhmZXJzAAMJYXNzZXRfaWRzCHVpbnQ2NFtdC2JlbmVmaWNpYXJ5BG5hbWUEbWVtbwZzdHJpbmcKbmZ0bWV0YW1hcAACF2ZvcmVpZ25fY29sbGVjdGlvbl9uYW1lBG5hbWUVbG9jYWxfY29sbGVjdGlvbl9uYW1lBG5hbWUHbmZ0eGZlcgAEBW93bmVyBG5hbWUGYXNzZXRzCmFzc2V0c19zW10LYmVuZWZpY2lhcnkEbmFtZQRtZW1vBnN0cmluZxxwYWlyX3N0cmluZ19BVE9NSUNfQVRUUklCVVRFAAIFZmlyc3QGc3RyaW5nBnNlY29uZBBBVE9NSUNfQVRUUklCVVRFEXBhaXJfdWludDE2X2J5dGVzAAIFZmlyc3QGdWludDE2BnNlY29uZAVieXRlcxBwZXJtaXNzaW9uX2xldmVsAAIFYWN0b3IEbmFtZQpwZXJtaXNzaW9uBG5hbWUJcHJvY2Vzc2VkAAICaWQGdWludDY0DnJlY2VpcHRfZGlnZXN0C2NoZWNrc3VtMjU2DHByb2R1Y2VyX2tleQACDXByb2R1Y2VyX25hbWUEbmFtZRFibG9ja19zaWduaW5nX2tleQpwdWJsaWNfa2V5EXByb2R1Y2VyX3NjaGVkdWxlAAIHdmVyc2lvbgZ1aW50MzIJcHJvZHVjZXJzDnByb2R1Y2VyX2tleVtdDHNibG9ja2hlYWRlcgAEBmhlYWRlcgtibG9ja2hlYWRlchNwcm9kdWNlcl9zaWduYXR1cmVzC3NpZ25hdHVyZVtdD3ByZXZpb3VzX2Jtcm9vdAtjaGVja3N1bTI1NgtibXByb29mcGF0aAh1aW50MTZbXQt0ZW1wbGF0ZW1hcAACE2ZvcmVpZ25fdGVtcGxhdGVfaWQFaW50MzIRbG9jYWxfdGVtcGxhdGVfaWQFaW50MzIJdGVtcG1hcHJtAAIdZm9yZWlnbl9jb2xsZWN0aW9uX25hbWVfc2NvcGUEbmFtZRNmb3JlaWduX3RlbXBsYXRlX2lkBWludDMyCnRlbXBtYXBzZXQAAh1mb3JlaWduX2NvbGxlY3Rpb25fbmFtZV9zY29wZQRuYW1lDHRlbXBsYXRlX21hcAt0ZW1wbGF0ZW1hcAl0ZW1wbmZ0aWQAAxBmb3JlaWduX2Fzc2V0X2lkBnVpbnQ2NApiZW5maWNpYXJ5BG5hbWUEbWVtbwZzdHJpbmcOAAAAwESFpkEHY2FuY2VsYQAAAADgRIWmQQdjYW5jZWxiAAAAAEDFY7BLB2Rpc2FibGUAAAAAAKh4zFQGZW5hYmxlAAAAAAAAkN10BGluaXQAAIyRqiGc3XQLaW5pdHNjaGVtYWEAAI6RqiGc3XQLaW5pdHNjaGVtYWIAAAAAABilMXYGaXNzdWVhAAAAAAAcpTF2Bmlzc3VlYgAAAJC3GmmykgltZXRhbWFwcm0AAEBWuBppspIKbWV0YW1hcHNldAAAALhq9eTymgluZnRpZHhmZXIAAACQtxpZpcoJdGVtcG1hcHJtAABAVrgaWaXKCnRlbXBtYXBzZXQAC4BVNrFKlZ1UA2k2NAAADGVtaXRlbXBsYXRlcwAAAABEc2hkA2k2NAAABmdsb2JhbADAovRWv41qA2k2NAAACGhwc3RydWN0AMCi9NbcmIsDaTY0AAAIbHBzdHJ1Y3QAAADVyOTymgNpNjQAAAhuZnRpZG1hcAAAvmr15PKaA2k2NAAACm5mdGlkeGZlcnMAQDXSZCXzmgNpNjQAAApuZnRtZXRhbWFwAAAA4KrV85oDaTY0AAAHbmZ0eGZlcgAASApjheitA2k2NAAACXByb2Nlc3NlZACqkSqbWKXKA2k2NAAAC3RlbXBsYXRlbWFwAABILq9ZpcoDaTY0AAAJdGVtcG5mdGlkAAAAAcIBdmFyaWFudF9pbnQ4X2ludDE2X2ludDMyX2ludDY0X3VpbnQ4X3VpbnQxNl91aW50MzJfdWludDY0X2Zsb2F0MzJfZmxvYXQ2NF9zdHJpbmdfSU5UOF9WRUNfSU5UMTZfVkVDX0lOVDMyX1ZFQ19JTlQ2NF9WRUNfVUlOVDhfVkVDX1VJTlQxNl9WRUNfVUlOVDMyX1ZFQ19VSU5UNjRfVkVDX0ZMT0FUX1ZFQ19ET1VCTEVfVkVDX1NUUklOR19WRUMWBGludDgFaW50MTYFaW50MzIFaW50NjQFdWludDgGdWludDE2BnVpbnQzMgZ1aW50NjQHZmxvYXQzMgdmbG9hdDY0BnN0cmluZwhJTlQ4X1ZFQwlJTlQxNl9WRUMJSU5UMzJfVkVDCUlOVDY0X1ZFQwlVSU5UOF9WRUMKVUlOVDE2X1ZFQwpVSU5UMzJfVkVDClVJTlQ2NF9WRUMJRkxPQVRfVkVDCkRPVUJMRV9WRUMKU1RSSU5HX1ZFQwA="
)
export const abi = ABI.from(abiBlob)
export namespace Types {
  @Variant.type(
    "variant_int8_int16_int32_int64_uint8_uint16_uint32_uint64_float32_float64_string_INT8_VEC_INT16_VEC_INT32_VEC_INT64_VEC_UINT8_VEC_UINT16_VEC_UINT32_VEC_UINT64_VEC_FLOAT_VEC_DOUBLE_VEC_STRING_VEC",
    [
      Int8,
      Int16,
      Int32,
      Int64,
      UInt8,
      UInt16,
      UInt32,
      UInt64,
      Float32,
      Float64,
      "string",
      Bytes,
      { type: Int16, array: true },
      { type: Int32, array: true },
      { type: Int64, array: true },
      Bytes,
      { type: UInt16, array: true },
      { type: UInt32, array: true },
      { type: UInt64, array: true },
      { type: Float32, array: true },
      { type: Float64, array: true },
      "string[]"
    ]
  )
  export class variant_int8_int16_int32_int64_uint8_uint16_uint32_uint64_float32_float64_string_INT8_VEC_INT16_VEC_INT32_VEC_INT64_VEC_UINT8_VEC_UINT16_VEC_UINT32_VEC_UINT64_VEC_FLOAT_VEC_DOUBLE_VEC_STRING_VEC extends Variant {
    declare value:| Int8
    | Int16
    | Int32
    | Int64
    | UInt8
    | UInt16
    | UInt32
    | UInt64
    | Float32
    | Float64
    | string
    | Bytes
    | Int16[]
    | Int32[]
    | Int64[]
    | Bytes
    | UInt16[]
    | UInt32[]
    | UInt64[]
    | Float32[]
    | Float64[]
    | string[]
  }
  @Struct.type("permission_level")
  export class permission_level extends Struct {
    @Struct.field(Name)
      actor!:Name

    @Struct.field(Name)
      permission!:Name
  }
  @Struct.type("action")
  export class action extends Struct {
    @Struct.field(Name)
      account!:Name

    @Struct.field(Name)
      name!:Name

    @Struct.field(permission_level, { array: true })
      authorization!:permission_level[]

    @Struct.field(Bytes)
      data!:Bytes
  }
  @Struct.type("authseq")
  export class authseq extends Struct {
    @Struct.field(Name)
      account!:Name

    @Struct.field(UInt64)
      sequence!:UInt64
  }
  @Struct.type("actreceipt")
  export class actreceipt extends Struct {
    @Struct.field(Name)
      receiver!:Name

    @Struct.field(Checksum256)
      act_digest!:Checksum256

    @Struct.field(UInt64)
      global_sequence!:UInt64

    @Struct.field(UInt64)
      recv_sequence!:UInt64

    @Struct.field(authseq, { array: true })
      auth_sequence!:authseq[]

    @Struct.field(VarUInt)
      code_sequence!:VarUInt

    @Struct.field(VarUInt)
      abi_sequence!:VarUInt
  }
  @Struct.type("actionproof")
  export class actionproof extends Struct {
    @Struct.field(action)
      action!:action

    @Struct.field(actreceipt)
      receipt!:actreceipt

    @Struct.field(Bytes)
      returnvalue!:Bytes

    @Struct.field(Checksum256, { array: true })
      amproofpath!:Checksum256[]
  }
  @Struct.type("producer_key")
  export class producer_key extends Struct {
    @Struct.field(Name)
      producer_name!:Name

    @Struct.field(PublicKey)
      block_signing_key!:PublicKey
  }
  @Struct.type("producer_schedule")
  export class producer_schedule extends Struct {
    @Struct.field(UInt32)
      version!:UInt32

    @Struct.field(producer_key, { array: true })
      producers!:producer_key[]
  }
  @Struct.type("pair_uint16_bytes")
  export class pair_uint16_bytes extends Struct {
    @Struct.field(UInt16)
      first!:UInt16

    @Struct.field(Bytes)
      second!:Bytes
  }
  @Struct.type("blockheader")
  export class blockheader extends Struct {
    @Struct.field(BlockTimestamp)
      timestamp!:BlockTimestamp

    @Struct.field(Name)
      producer!:Name

    @Struct.field(UInt16)
      confirmed!:UInt16

    @Struct.field(Checksum256)
      previous!:Checksum256

    @Struct.field(Checksum256)
      transaction_mroot!:Checksum256

    @Struct.field(Checksum256)
      action_mroot!:Checksum256

    @Struct.field(UInt32)
      schedule_version!:UInt32

    @Struct.field(producer_schedule, { optional: true })
      new_producers?:producer_schedule

    @Struct.field(pair_uint16_bytes, { array: true })
      header_extensions!:pair_uint16_bytes[]
  }
  @Struct.type("sblockheader")
  export class sblockheader extends Struct {
    @Struct.field(blockheader)
      header!:blockheader

    @Struct.field(Signature, { array: true })
      producer_signatures!:Signature[]

    @Struct.field(Checksum256)
      previous_bmroot!:Checksum256

    @Struct.field(UInt16, { array: true })
      bmproofpath!:UInt16[]
  }
  @Struct.type("anchorblock")
  export class anchorblock extends Struct {
    @Struct.field(sblockheader)
      block!:sblockheader

    @Struct.field(UInt16, { array: true })
      active_nodes!:UInt16[]

    @Struct.field(UInt64)
      node_count!:UInt64
  }
  @Struct.type("assets_s")
  export class assets_s extends Struct {
    @Struct.field(UInt64)
      asset_id!:UInt64

    @Struct.field(Name)
      collection_name!:Name

    @Struct.field(Name)
      schema_name!:Name

    @Struct.field(Int32)
      template_id!:Int32

    @Struct.field(Name)
      ram_payer!:Name

    @Struct.field(Asset, { array: true })
      backed_tokens!:Asset[]

    @Struct.field(Bytes)
      immutable_serialized_data!:Bytes

    @Struct.field(Bytes)
      mutable_serialized_data!:Bytes
  }
  @Struct.type("heavyproof")
  export class heavyproof extends Struct {
    @Struct.field(Checksum256)
      chain_id!:Checksum256

    @Struct.field(Checksum256, { array: true })
      hashes!:Checksum256[]

    @Struct.field(anchorblock)
      blocktoprove!:anchorblock

    @Struct.field(sblockheader, { array: true })
      bftproof!:sblockheader[]
  }
  @Struct.type("cancela")
  export class cancela extends Struct {
    @Struct.field(Name)
      prover!:Name

    @Struct.field(heavyproof)
      blockproof!:heavyproof

    @Struct.field(actionproof)
      actionproof!:actionproof
  }
  @Struct.type("lightproof")
  export class lightproof extends Struct {
    @Struct.field(Checksum256)
      chain_id!:Checksum256

    @Struct.field(blockheader)
      header!:blockheader

    @Struct.field(Checksum256)
      root!:Checksum256

    @Struct.field(Checksum256, { array: true })
      bmproofpath!:Checksum256[]
  }
  @Struct.type("cancelb")
  export class cancelb extends Struct {
    @Struct.field(Name)
      prover!:Name

    @Struct.field(lightproof)
      blockproof!:lightproof

    @Struct.field(actionproof)
      actionproof!:actionproof
  }
  @Struct.type("disable")
  export class disable extends Struct {}
  @Struct.type("pair_string_ATOMIC_ATTRIBUTE")
  export class pair_string_ATOMIC_ATTRIBUTE extends Struct {
    @Struct.field("string")
      first!:string

    @Struct.field(
      variant_int8_int16_int32_int64_uint8_uint16_uint32_uint64_float32_float64_string_INT8_VEC_INT16_VEC_INT32_VEC_INT64_VEC_UINT8_VEC_UINT16_VEC_UINT32_VEC_UINT64_VEC_FLOAT_VEC_DOUBLE_VEC_STRING_VEC
    )
      second!:variant_int8_int16_int32_int64_uint8_uint16_uint32_uint64_float32_float64_string_INT8_VEC_INT16_VEC_INT32_VEC_INT64_VEC_UINT8_VEC_UINT16_VEC_UINT32_VEC_UINT64_VEC_FLOAT_VEC_DOUBLE_VEC_STRING_VEC
  }
  @Struct.type("emitemplates")
  export class emitemplates extends Struct {
    @Struct.field(Name)
      collection_name!:Name

    @Struct.field(Int32)
      template_id!:Int32

    @Struct.field(Name)
      schema_name!:Name

    @Struct.field(pair_string_ATOMIC_ATTRIBUTE, { array: true })
      template_immutable_data!:pair_string_ATOMIC_ATTRIBUTE[]
  }
  @Struct.type("enable")
  export class enable extends Struct {}
  @Struct.type("global")
  export class global extends Struct {
    @Struct.field(Checksum256)
      chain_id!:Checksum256

    @Struct.field(Name)
      bridge_contract!:Name

    @Struct.field(Checksum256)
      paired_chain_id!:Checksum256

    @Struct.field(Name)
      paired_wraplock_contract!:Name

    @Struct.field(Name)
      paired_token_contract!:Name

    @Struct.field("bool")
      enabled!:boolean
  }
  @Struct.type("hpstruct")
  export class hpstruct extends Struct {
    @Struct.field(UInt64)
      id!:UInt64

    @Struct.field(heavyproof)
      hp!:heavyproof
  }
  @Struct.type("init")
  export class init extends Struct {
    @Struct.field(Checksum256)
      chain_id!:Checksum256

    @Struct.field(Name)
      bridge_contract!:Name

    @Struct.field(Checksum256)
      paired_chain_id!:Checksum256

    @Struct.field(Name)
      paired_wraplock_contract!:Name
  }
  @Struct.type("initschemaa")
  export class initschemaa extends Struct {
    @Struct.field(Name)
      prover!:Name

    @Struct.field(heavyproof)
      blockproof!:heavyproof

    @Struct.field(actionproof)
      actionproof!:actionproof
  }
  @Struct.type("initschemab")
  export class initschemab extends Struct {
    @Struct.field(Name)
      prover!:Name

    @Struct.field(lightproof)
      blockproof!:lightproof

    @Struct.field(actionproof)
      actionproof!:actionproof
  }
  @Struct.type("issuea")
  export class issuea extends Struct {
    @Struct.field(Name)
      prover!:Name

    @Struct.field(heavyproof)
      blockproof!:heavyproof

    @Struct.field(actionproof)
      actionproof!:actionproof
  }
  @Struct.type("issueb")
  export class issueb extends Struct {
    @Struct.field(Name)
      prover!:Name

    @Struct.field(lightproof)
      blockproof!:lightproof

    @Struct.field(actionproof)
      actionproof!:actionproof
  }
  @Struct.type("lpstruct")
  export class lpstruct extends Struct {
    @Struct.field(UInt64)
      id!:UInt64

    @Struct.field(lightproof)
      lp!:lightproof
  }
  @Struct.type("metamaprm")
  export class metamaprm extends Struct {
    @Struct.field(Name)
      foreign_collection_name!:Name
  }
  @Struct.type("nftmetamap")
  export class nftmetamap extends Struct {
    @Struct.field(Name)
      foreign_collection_name!:Name

    @Struct.field(Name)
      local_collection_name!:Name
  }
  @Struct.type("metamapset")
  export class metamapset extends Struct {
    @Struct.field(nftmetamap)
      map_entry!:nftmetamap
  }
  @Struct.type("nftidmap")
  export class nftidmap extends Struct {
    @Struct.field(UInt64)
      local_asset_id!:UInt64

    @Struct.field(UInt64)
      foreign_asset_id!:UInt64
  }
  @Struct.type("nftidxfers")
  export class nftidxfers extends Struct {
    @Struct.field(UInt64, { array: true })
      asset_ids!:UInt64[]

    @Struct.field(Name)
      beneficiary!:Name

    @Struct.field("string")
      memo!:string
  }
  @Struct.type("nftidxfer")
  export class nftidxfer extends Struct {
    @Struct.field(nftidxfers)
      nftidxfer!:nftidxfers
  }
  @Struct.type("nftxfer")
  export class nftxfer extends Struct {
    @Struct.field(Name)
      owner!:Name

    @Struct.field(assets_s, { array: true })
      assets!:assets_s[]

    @Struct.field(Name)
      beneficiary!:Name

    @Struct.field("string")
      memo!:string
  }
  @Struct.type("processed")
  export class processed extends Struct {
    @Struct.field(UInt64)
      id!:UInt64

    @Struct.field(Checksum256)
      receipt_digest!:Checksum256
  }
  @Struct.type("templatemap")
  export class templatemap extends Struct {
    @Struct.field(Int32)
      foreign_template_id!:Int32

    @Struct.field(Int32)
      local_template_id!:Int32
  }
  @Struct.type("tempmaprm")
  export class tempmaprm extends Struct {
    @Struct.field(Name)
      foreign_collection_name_scope!:Name

    @Struct.field(Int32)
      foreign_template_id!:Int32
  }
  @Struct.type("tempmapset")
  export class tempmapset extends Struct {
    @Struct.field(Name)
      foreign_collection_name_scope!:Name

    @Struct.field(templatemap)
      template_map!:templatemap
  }
  @Struct.type("tempnftid")
  export class tempnftid extends Struct {
    @Struct.field(UInt64)
      foreign_asset_id!:UInt64

    @Struct.field(Name)
      benficiary!:Name

    @Struct.field("string")
      memo!:string
  }
}
export const TableMap = {
  emitemplates: Types.emitemplates,
  global: Types.global,
  heavyproof: Types.hpstruct,
  lightproof: Types.lpstruct,
  nftidmap: Types.nftidmap,
  nftidxfers: Types.nftidxfers,
  nftmetamap: Types.nftmetamap,
  nftxfer: Types.nftxfer,
  processed: Types.processed,
  templatemap: Types.templatemap,
  tempnftid: Types.tempnftid
}
export interface TableTypes {
  emitemplates:Types.emitemplates
  global:Types.global
  heavyproof:Types.hpstruct
  lightproof:Types.lpstruct
  nftidmap:Types.nftidmap
  nftidxfers:Types.nftidxfers
  nftmetamap:Types.nftmetamap
  nftxfer:Types.nftxfer
  processed:Types.processed
  templatemap:Types.templatemap
  tempnftid:Types.tempnftid
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
  export namespace Type {
    export interface heavyproof {
      chain_id:Checksum256Type
      hashes:Checksum256Type[]
      blocktoprove:Type.anchorblock
      bftproof:Type.sblockheader[]
    }
    export interface anchorblock {
      block:Type.sblockheader
      active_nodes:UInt16Type[]
      node_count:UInt64Type
    }
    export interface sblockheader {
      header:Type.blockheader
      producer_signatures:SignatureType[]
      previous_bmroot:Checksum256Type
      bmproofpath:UInt16Type[]
    }
    export interface blockheader {
      timestamp:BlockTimestamp
      producer:NameType
      confirmed:UInt16Type
      previous:Checksum256Type
      transaction_mroot:Checksum256Type
      action_mroot:Checksum256Type
      schedule_version:UInt32Type
      new_producers:Type.producer_schedule
      header_extensions:Type.pair_uint16_bytes[]
    }
    export interface producer_schedule {
      version:UInt32Type
      producers:Type.producer_key[]
    }
    export interface producer_key {
      producer_name:NameType
      block_signing_key:PublicKeyType
    }
    export interface pair_uint16_bytes {
      first:UInt16Type
      second:BytesType
    }
    export interface actionproof {
      action:Type.action
      receipt:Type.actreceipt
      returnvalue:BytesType
      amproofpath:Checksum256Type[]
    }
    export interface action {
      account:NameType
      name:NameType
      authorization:Type.permission_level[]
      data:BytesType
    }
    export interface permission_level {
      actor:NameType
      permission:NameType
    }
    export interface actreceipt {
      receiver:NameType
      act_digest:Checksum256Type
      global_sequence:UInt64Type
      recv_sequence:UInt64Type
      auth_sequence:Type.authseq[]
      code_sequence:VarUIntType
      abi_sequence:VarUIntType
    }
    export interface authseq {
      account:NameType
      sequence:UInt64Type
    }
    export interface lightproof {
      chain_id:Checksum256Type
      header:Type.blockheader
      root:Checksum256Type
      bmproofpath:Checksum256Type[]
    }
    export interface nftmetamap {
      foreign_collection_name:NameType
      local_collection_name:NameType
    }
    export interface nftidxfers {
      asset_ids:UInt64Type[]
      beneficiary:NameType
      memo:string
    }
    export interface templatemap {
      foreign_template_id:Int32Type
      local_template_id:Int32Type
    }
  }
  export interface cancela {
    prover:NameType
    blockproof:Type.heavyproof
    actionproof:Type.actionproof
  }
  export interface cancelb {
    prover:NameType
    blockproof:Type.lightproof
    actionproof:Type.actionproof
  }
  export interface disable {}
  export interface enable {}
  export interface init {
    chain_id:Checksum256Type
    bridge_contract:NameType
    paired_chain_id:Checksum256Type
    paired_wraplock_contract:NameType
  }
  export interface initschemaa {
    prover:NameType
    blockproof:Type.heavyproof
    actionproof:Type.actionproof
  }
  export interface initschemab {
    prover:NameType
    blockproof:Type.lightproof
    actionproof:Type.actionproof
  }
  export interface issuea {
    prover:NameType
    blockproof:Type.heavyproof
    actionproof:Type.actionproof
  }
  export interface issueb {
    prover:NameType
    blockproof:Type.lightproof
    actionproof:Type.actionproof
  }
  export interface metamaprm {
    foreign_collection_name:NameType
  }
  export interface metamapset {
    map_entry:Type.nftmetamap
  }
  export interface nftidxfer {
    nftidxfer:Type.nftidxfers
  }
  export interface tempmaprm {
    foreign_collection_name_scope:NameType
    foreign_template_id:Int32Type
  }
  export interface tempmapset {
    foreign_collection_name_scope:NameType
    template_map:Type.templatemap
  }
}
export interface ActionNameParams {
  cancela:ActionParams.cancela
  cancelb:ActionParams.cancelb
  disable:ActionParams.disable
  enable:ActionParams.enable
  init:ActionParams.init
  initschemaa:ActionParams.initschemaa
  initschemab:ActionParams.initschemab
  issuea:ActionParams.issuea
  issueb:ActionParams.issueb
  metamaprm:ActionParams.metamaprm
  metamapset:ActionParams.metamapset
  nftidxfer:ActionParams.nftidxfer
  tempmaprm:ActionParams.tempmaprm
  tempmapset:ActionParams.tempmapset
}
export type ActionNames = keyof ActionNameParams
export class Contract extends BaseContract {
  constructor(args:PartialBy<ContractArgs, "abi" | "account">) {
    super({
      client: args.client,
      abi,
      account: args.account || Name.from("unknown")
    })
  }

  action<T extends ActionNames>(
    name:T,
    data:ActionNameParams[T],
    options?:ActionOptions
  ):Action {
    return super.action(name, data, options)
  }

  table<T extends TableNames>(name:T, scope?:NameType):Table<RowType<T>> {
    return super.table(name, scope, TableMap[name])
  }
}
