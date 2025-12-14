import { customAlphabet } from 'nanoid/non-secure';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/1/I
const nano = customAlphabet(alphabet, 6);
export const generateCode = () => nano();