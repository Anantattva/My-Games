// ।। ॐ नमः शिवाय ।। \\
// @date 22nd September, 2026

// I was forced to create this file
// Cuz I wanted my parallel Web Worker AI to work
// However, having window references inside other files was causing trouble

/**
 * Golden Rule of ES Modules & Workers
 * 
 * If File A imports File B, and File B references window or document unconditionally at the top level,
 * File A can NEVER be imported inside a Web Worker.
 * 
 * Adding the typeof window !== 'undefined' check inside
 * our shared constants file completely neutralizes this
 * problem across our entire project.
 */

const isWindow = typeof window !== 'undefined';

export const dpr = isWindow ? window.devicePixelRatio : 2;
export const vw  = isWindow ? window.innerWidth : 384;
export const vh  = isWindow ? window.innerHeight : 694;

export const uw = vw / 100;
export const uh = vh / 100;
export const u = (uw + uh) / 2;

export const logicalWidth = 40 * uh;
export const logicalHeight = 40 * uh;

export const FRICTION = 0.03;
export const MOMENTUM_TRANSFER_RATIO = 0.85