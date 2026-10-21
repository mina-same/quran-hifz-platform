/// <reference types="jest" />
import { parseDecimalText } from './decimal';

describe('parseDecimalText', () => {
  it('keeps a trailing dot while typing', () => {
    expect(parseDecimalText('2.')).toEqual({ text: '2.', value: 2 });
  });
  it('accepts Arabic digits and the Arabic decimal comma', () => {
    expect(parseDecimalText('٢٫٥')).toEqual({ text: '2.5', value: 2.5 });
    expect(parseDecimalText('1,25')).toEqual({ text: '1.25', value: 1.25 });
  });
  it('caps at two decimals and one dot', () => {
    expect(parseDecimalText('3.456')).toEqual({ text: '3.45', value: 3.45 });
    expect(parseDecimalText('1.2.3')).toEqual({ text: '1.23', value: 1.23 });
  });
  it('is 0 while empty', () => {
    expect(parseDecimalText('')).toEqual({ text: '', value: 0 });
    expect(parseDecimalText('abc')).toEqual({ text: '', value: 0 });
  });
});
