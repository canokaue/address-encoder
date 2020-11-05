// Ported from https://www.npmjs.com/package/@glif/filecoin-address to reduce file size

import { Address } from './address';
import {
    b32decode,
    b32encode,
    hex2a
} from 'crypto-addr-codec';
const blake = require('blakejs');
  
function validateChecksum (ingest:Buffer, expect:Buffer){
    const digest = getChecksum(ingest)
    return Buffer.compare(Buffer.from(digest), expect)
}

function getChecksum (ingest:Buffer):Buffer {
    // const encoded = nanoBase32Encode(Uint8Array.from(data));
    return blake.blake2b(ingest, null, 4)
}

function checkAddressString (address:string){
    if (!address) throw Error('No bytes to validate.')
    if (address.length < 3) throw Error('Address is too short to validate.')
    if (address[0] !== 'f' && address[0] !== 't') {
        throw Error('Unknown address network.')
    }

    switch (address[1]) {
        case '0': {
        if (address.length > 22) throw Error('Invalid ID address length.')
        break
        }
        case '1': {
        if (address.length !== 41)
            throw Error('Invalid secp256k1 address length.')
        break
        }
        case '2': {
        if (address.length !== 41) throw Error('Invalid Actor address length.')
        break
        }
        case '3': {
        if (address.length !== 86) throw Error('Invalid BLS address length.')
        break
        }
        default: {
        throw new Error('Invalid address protocol.')
        }
    }
}

function filDecode (address: string) {
    checkAddressString(address)

    const network = address.slice(0, 1)
    const protocol = address.slice(1, 2)
    // const protocolByte = Buffer.alloc(1)
    // protocolByte[0] = protocol
    const protocolByte = Buffer.from([1])
    const raw = address.substring(2, address.length)

    // if (protocol === '0') {
    //   return newAddress(protocol, Buffer.from(leb.unsigned.encode(raw)))
    // }
    const payloadChecksum = Buffer.from(b32decode(raw.toUpperCase()))
    const { length } = payloadChecksum
    const payload = payloadChecksum.slice(0, length - 4)
    const checksum = payloadChecksum.slice(length - 4, length)
    if (validateChecksum(Buffer.concat([protocolByte, payload]), checksum)) {
        throw Error("Checksums don't match")
    }

    const addressObj = filNewAddress(protocol, payload)
    if (filEncode(network, addressObj) !== address)
        throw Error(`Did not encode this address properly: ${address}`)
    return addressObj
}

function filEncode (network:string, address:Address) {
    if (!address || !address.str) throw Error('Invalid address')
    let addressString = ''
    const payload = address.payload()
    const protocolByte = Buffer.alloc(1)
    protocolByte[0] = address.protocol()
    const toChecksum = Buffer.concat([protocolByte, payload])
    const checksum = getChecksum(toChecksum)
    const bytes = Buffer.concat([payload, Buffer.from(checksum)])
    const bytes2a = hex2a(bytes.toString('hex'));
    const bytes32encoded = b32encode(bytes2a).replace(/=/g, '').toLowerCase();
    return String(network) + String(address.protocol()) + bytes32encoded
}

function filNewAddress (protocol:string, payload:Buffer): Address {
    const protocolByte2 = Buffer.alloc(1)
    // protocolByte2[0] = protocol
    const protocolByte = Buffer.from([1])
    console.log('***fileNewAddress', protocolByte, protocolByte2)
    const input = Buffer.concat([protocolByte, payload])
    return new Address(input)
}
  
export function filAddrEncoder(data: Buffer): string {
    const address = filNewAddress('1', data)
    const encoded = filEncode('f', address)
    console.log('filAddrEncoder', {encoded, address, data})
    return encoded.toString()
}
    
export function filAddrDecoder(data: string): Buffer {
    const address = filDecode(data)
    
    let r = address.payload()
    console.log('filAddrDecoder', {address, data, r})
    return r
}    
