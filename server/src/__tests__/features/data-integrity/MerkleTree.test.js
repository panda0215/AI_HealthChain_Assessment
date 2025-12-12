/**
 * Merkle Tree Tests
 */

const MerkleTree = require('../../../features/data-integrity/MerkleTree.js');

describe('MerkleTree', () => {
  describe('Tree Construction', () => {
    test('should build tree from array of data', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = new MerkleTree(data);
      expect(tree.getRoot()).toBeTruthy();
      expect(typeof tree.getRoot()).toBe('string');
    });

    test('should handle single leaf', () => {
      const data = ['single-record'];
      const tree = new MerkleTree(data);
      expect(tree.getRoot()).toBeTruthy();
    });

    test('should handle odd number of leaves', () => {
      const data = ['record1', 'record2', 'record3'];
      const tree = new MerkleTree(data);
      expect(tree.getRoot()).toBeTruthy();
    });

    test('should handle empty array', () => {
      const tree = new MerkleTree([]);
      expect(tree.getRoot()).toBe(null);
    });
  });

  describe('Proof Generation', () => {
    test('should generate proof for record', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = new MerkleTree(data);
      const proof = tree.getProof('record1');
      
      expect(proof).toHaveProperty('leaf');
      expect(proof).toHaveProperty('path');
      expect(proof).toHaveProperty('root');
      expect(Array.isArray(proof.path)).toBe(true);
    });

    test('should generate different proofs for different records', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = new MerkleTree(data);
      const proof1 = tree.getProof('record1');
      const proof2 = tree.getProof('record2');
      
      expect(proof1.leaf).not.toBe(proof2.leaf);
    });
  });

  describe('Proof Verification', () => {
    test('should verify valid proof', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = new MerkleTree(data);
      const root = tree.getRoot();
      const proof = tree.getProof('record1');
      
      const isValid = MerkleTree.verifyProof('record1', proof, root);
      expect(isValid).toBe(true);
    });

    test('should reject invalid proof', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = new MerkleTree(data);
      const root = tree.getRoot();
      const proof = tree.getProof('record1');
      
      const isValid = MerkleTree.verifyProof('tampered-record', proof, root);
      expect(isValid).toBe(false);
    });

    test('should reject proof with wrong root', () => {
      const data1 = ['record1', 'record2'];
      const data2 = ['record3', 'record4'];
      const tree1 = new MerkleTree(data1);
      const tree2 = new MerkleTree(data2);
      
      const proof = tree1.getProof('record1');
      const isValid = MerkleTree.verifyProof('record1', proof, tree2.getRoot());
      expect(isValid).toBe(false);
    });
  });

  describe('Batch Verification', () => {
    test('should verify batch of records', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = new MerkleTree(data);
      const root = tree.getRoot();
      
      const proofs = [
        { data: 'record1', proof: tree.getProof('record1'), root },
        { data: 'record2', proof: tree.getProof('record2'), root },
        { data: 'record3', proof: tree.getProof('record3'), root }
      ];
      
      const result = MerkleTree.verifyBatch(proofs);
      expect(result).toBe(true);
    });

    test('should reject batch with invalid record', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = new MerkleTree(data);
      const root = tree.getRoot();
      
      const proofs = [
        { data: 'record1', proof: tree.getProof('record1'), root },
        { data: 'tampered', proof: tree.getProof('record2'), root }
      ];
      
      const result = MerkleTree.verifyBatch(proofs);
      expect(result).toBe(false);
    });
  });

  describe('Hashing', () => {
    test('should hash strings consistently', () => {
      const tree = new MerkleTree([]);
      const hash1 = tree.hash('test-data');
      const hash2 = tree.hash('test-data');
      expect(hash1).toBe(hash2);
    });

    test('should hash objects', () => {
      const tree = new MerkleTree([]);
      const obj = { id: '1', data: 'test' };
      const hash = tree.hash(obj);
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    test('should produce different hashes for different data', () => {
      const tree = new MerkleTree([]);
      const hash1 = tree.hash('data1');
      const hash2 = tree.hash('data2');
      expect(hash1).not.toBe(hash2);
    });
  });
});

