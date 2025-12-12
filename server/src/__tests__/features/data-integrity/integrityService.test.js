/**
 * Integrity Service Tests
 */

const IntegrityService = require('../../../features/data-integrity/integrityService.js');
const Blockchain = require('../../../core/Blockchain.js');

describe('IntegrityService', () => {
  let blockchain;
  let service;
  const mockData = {
    patients: [],
    clinicians: [],
    aiModels: [],
    medicalRecords: [],
    consentRecords: []
  };

  beforeEach(() => {
    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    service = new IntegrityService(blockchain, mockData);
  });

  describe('createMerkleTree', () => {
    test('should create Merkle tree successfully', async () => {
      const records = ['record1', 'record2', 'record3'];
      const result = await service.createMerkleTree(records);

      expect(result).toHaveProperty('root');
      expect(result).toHaveProperty('recordCount');
      expect(result.recordCount).toBe(3);
      expect(typeof result.root).toBe('string');
    });

    test('should store root on chain when requested', async () => {
      const records = ['record1', 'record2'];
      const result = await service.createMerkleTree(records, {
        storeOnChain: true,
        description: 'Test tree'
      });

      expect(result.transaction).toBeTruthy();
      expect(result.transaction.transaction).toHaveProperty('id');
    });

    test('should throw error for empty records', async () => {
      await expect(
        service.createMerkleTree([])
      ).rejects.toThrow('empty');
    });

    test('should handle object records', async () => {
      const records = [
        { id: '1', diagnosis: 'Hypertension' },
        { id: '2', diagnosis: 'Diabetes' }
      ];
      const result = await service.createMerkleTree(records);

      expect(result.recordCount).toBe(2);
      expect(result.root).toBeTruthy();
    });
  });

  describe('generateProof', () => {
    let root;

    beforeEach(async () => {
      const treeResult = await service.createMerkleTree(['record1', 'record2', 'record3']);
      root = treeResult.root;
    });

    test('should generate proof successfully', async () => {
      const result = await service.generateProof('record1', root);

      expect(result).toHaveProperty('proof');
      expect(result).toHaveProperty('root');
      expect(result.proof).toHaveProperty('leaf');
      expect(result.proof).toHaveProperty('path');
    });

    test('should throw error for missing root', async () => {
      await expect(
        service.generateProof('record1', null)
      ).rejects.toThrow('required');
    });

    test('should handle object records', async () => {
      const treeResult = await service.createMerkleTree([
        { id: '1', data: 'test' },
        { id: '2', data: 'test2' }
      ]);

      const result = await service.generateProof({ id: '1', data: 'test' }, treeResult.root);

      expect(result.proof).toBeTruthy();
    });
  });

  describe('verifyIntegrity', () => {
    let root, proof;

    beforeEach(async () => {
      const treeResult = await service.createMerkleTree(['record1', 'record2', 'record3']);
      root = treeResult.root;
      const proofResult = await service.generateProof('record1', root);
      proof = proofResult.proof;
    });

    test('should verify valid proof', async () => {
      const isValid = await service.verifyIntegrity('record1', proof, root);
      expect(isValid).toBe(true);
    });

    test('should reject invalid proof', async () => {
      const isValid = await service.verifyIntegrity('tampered-record', proof, root);
      expect(isValid).toBe(false);
    });

    test('should reject proof with wrong root', async () => {
      const tree2 = await service.createMerkleTree(['other1', 'other2']);
      const isValid = await service.verifyIntegrity('record1', proof, tree2.root);
      expect(isValid).toBe(false);
    });
  });

  describe('verifyBatch', () => {
    let root;

    beforeEach(async () => {
      const treeResult = await service.createMerkleTree(['record1', 'record2', 'record3', 'record4']);
      root = treeResult.root;
    });

    test('should verify batch successfully', async () => {
      const proof1 = (await service.generateProof('record1', root)).proof;
      const proof2 = (await service.generateProof('record2', root)).proof;

      const result = await service.verifyBatch([
        { data: 'record1', proof: proof1, root },
        { data: 'record2', proof: proof2, root }
      ]);

      expect(result).toHaveProperty('allValid');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('validCount');
      expect(result.allValid).toBe(true);
      expect(result.total).toBe(2);
      expect(result.validCount).toBe(2);
    });

    test('should detect invalid records in batch', async () => {
      const proof1 = (await service.generateProof('record1', root)).proof;
      const proof2 = (await service.generateProof('record2', root)).proof;

      const result = await service.verifyBatch([
        { data: 'record1', proof: proof1, root },
        { data: 'tampered', proof: proof2, root }
      ]);

      expect(result.allValid).toBe(false);
      expect(result.invalidCount).toBe(1);
    });

    test('should throw error for empty records', async () => {
      await expect(
        service.verifyBatch([])
      ).rejects.toThrow('empty');
    });

    test('should throw error for missing data field', async () => {
      await expect(
        service.verifyBatch([
          { proof: {}, root }
        ])
      ).rejects.toThrow('missing data field');
    });
  });
});

