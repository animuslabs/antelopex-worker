interface Timestamp {
  seconds:string;
}

interface ProducerToLast {
  name:string;
  lastBlockNumProduced:number;
}

interface AverageUsage {
  lastOrdinal:number;
  valueEx:string;
  consumed:string;
}

interface RLimitOps {
  operation:string;
  state:{
    averageBlockNetUsage:AverageUsage;
    averageBlockCpuUsage:AverageUsage;
    pendingNetUsage:string;
    pendingCpuUsage:string;
    totalNetWeight:string;
    totalCpuWeight:string;
    totalRamBytes:string;
    virtualNetLimit:string;
    virtualCpuLimit:string;
  };
}

export interface BlockData {
  id:string;
  number:number;
  version:number;
  header:{
    timestamp:Timestamp;
    producer:string;
    previous:string;
    transactionMroot:string;
    actionMroot:string;
    scheduleVersion:number;
  };
  producerSignature:string;
  unfilteredTransactions:UnfilteredTransaction[];
  dposProposedIrreversibleBlocknum:number;
  dposIrreversibleBlocknum:number;
  blockrootMerkle:{
    nodeCount:number;
    activeNodes:string[];
  };
  producerToLastProduced:ProducerToLast[];
  producerToLastImpliedIrb:ProducerToLast[];
  confirmCount:number[];
  pendingSchedule:{
    scheduleLibNum:number;
    scheduleHash:string;
    scheduleV2:{
      version:number;
    };
  };
  activatedProtocolFeatures:{
    protocolFeatures:string[];
  };
  rlimitOps:RLimitOps[];
  unfilteredImplicitTransactionOps:UnfilteredImplicitTransactionOp[];
  unfilteredTransactionTraces:UnfilteredTransactionTrace[];
}

interface UnfilteredTransaction {
  status:string;
  cpuUsageMicroSeconds:number;
  netUsageWords:number;
  id:string;
  packedTransaction:{
    signatures:string[];
    packedTransaction:string;
  };
}

interface Authorization {
  actor:string;
  permission:string;
}

interface UnfilteredImplicitTransactionOp {
  operation:string;
  name:string;
  transactionId:string;
  transaction:{
    transaction:{
      header:{
        expiration:{};
      };
      actions:[
        {
          account:string;
          name:string;
          authorization:Authorization[];
          jsonData:string;
          rawData:string;
        }
      ];
    };
  };
}

interface UnfilteredTransactionTrace {
  id:string;
  blockNum:string;
  blockTime:Timestamp;
  producerBlockId:string;
  receipt:{
    status:string;
    cpuUsageMicroSeconds:number;
  };
  elapsed:string;
  actionTraces:ActionTrace[];
  dbOps:DbOp[];
}

export interface ActionTrace {
  receipt:{
    receiver:string;
    digest:string;
    globalSequence:string;
    authSequence:{ accountName:string; sequence:string }[];
    recvSequence:string;
    codeSequence:string;
    abiSequence:string;
  };
  action:{
    account:string;
    name:string;
    authorization:Authorization[];
    jsonData:string;
    rawData:string;
  };
  elapsed:string;
  transactionId:string;
  blockNum:string;
  producerBlockId:string;
  blockTime:Timestamp;
  accountRamDeltas:{ account:string }[];
  receiver:string;
  actionOrdinal:number;
}

interface DbOp {
  operation:string;
  code:string;
  tableName:string;
  primaryKey:string;
}
