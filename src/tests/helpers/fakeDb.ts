/**
 * Tiny in-memory stand-ins for Mongoose models + a mail-sender stub, used by the workshop tests.
 *
 * NOT a real database: the fake implements just the query/update operators the code under test uses,
 * and runs every find-and-update / updateOne synchronously, i.e. atomically per document — the same
 * guarantee MongoDB gives for a single-document update. It proves the logic and the claim pattern,
 * not the behaviour of a real MongoDB server.
 */
import { mock } from 'node:test';
import mongoose from 'mongoose';

// ── mail stub (must be installed BEFORE any app module that imports ./mailSender is loaded) ──
export type SentMail = { to: string; subject: string; html: string };
export const sentMails: SentMail[] = [];
export const mailFailures = new Map<string, number>(); // address → how many sends should still fail

export const installMailStub = () => {
  const mailSenderPath = require.resolve('../../app/utils/mailSender');
  (require.cache as any)[mailSenderPath] = {
    id: mailSenderPath,
    filename: mailSenderPath,
    loaded: true,
    children: [],
    paths: [],
    exports: {
      sendEmail: async (to: string, subject: string, html: string) => {
        await Promise.resolve(); // real sends are async: lets concurrent runs interleave
        const left = mailFailures.get(to) || 0;
        if (left > 0) {
          mailFailures.set(to, left - 1);
          throw new Error(`smtp failure for ${to}`);
        }
        sentMails.push({ to, subject, html });
      },
    },
  };
};

// ── fake documents ──
const getPath = (obj: any, path: string) =>
  path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const setPath = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  let cur = obj;
  keys.slice(0, -1).forEach((k) => {
    if (cur[k] == null) cur[k] = {};
    cur = cur[k];
  });
  cur[keys[keys.length - 1]] = value;
};

const isId = (v: any) => v instanceof mongoose.Types.ObjectId;

const sameValue = (a: any, b: any) => String(a) === String(b);

const matchesCondition = (actual: any, cond: any): boolean => {
  if (cond && typeof cond === 'object' && !(cond instanceof Date) && !isId(cond)) {
    return Object.entries(cond).every(([op, v]: [string, any]) => {
      switch (op) {
        case '$lte': return actual != null && actual <= v;
        case '$gte': return actual != null && actual >= v;
        case '$gt': return actual != null && actual > v;
        case '$lt': return actual != null && actual < v;
        case '$ne': return matchesNe(actual, v);
        case '$in': return (v as any[]).some((x) => sameValue(actual, x));
        default: throw new Error(`fake db: operator ${op} not implemented`);
      }
    });
  }
  if (cond === null) return actual === null || actual === undefined; // Mongo: null matches missing
  return sameValue(actual, cond);
};

// `$ne: true` must match documents where the field is missing / false
const matchesNe = (actual: any, v: any) => (v === null ? actual != null : !sameValue(actual, v));

export const matches = (doc: any, filter: Record<string, any>): boolean =>
  Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return (cond as any[]).some((f) => matches(doc, f));
    const actual = getPath(doc, key);
    if (cond && typeof cond === 'object' && '$ne' in cond && Object.keys(cond).length === 1) {
      return matchesNe(actual, cond.$ne);
    }
    return matchesCondition(actual, cond);
  });

export const clone = (v: any): any => {
  if (isId(v)) return v;
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  return v;
};

const applyUpdate = (doc: any, update: any) => {
  for (const [path, v] of Object.entries(update.$set || {})) setPath(doc, path, v);
};

/** A chain that can be awaited directly OR after .select()/.sort()/.lean()/.populate() */
const chain = (get: () => Promise<any>) => {
  const c: any = {
    select: () => c,
    sort: () => c,
    lean: () => c,
    populate: () => c,
    then: (res: any, rej: any) => get().then(res, rej),
  };
  return c;
};

export class FakeCollection {
  docs: any[] = [];
  reset() { this.docs = []; }
  insert(doc: any) { this.docs.push(doc); return doc; }

  install(model: any) {
    mock.method(model, 'findById', (id: any) =>
      chain(async () => {
        await Promise.resolve();
        const d = this.docs.find((x) => sameValue(x._id, id));
        return d ? clone(d) : null;
      }));
    mock.method(model, 'findOne', (filter: any) =>
      chain(async () => {
        await Promise.resolve();
        const d = this.docs.find((x) => matches(x, filter));
        return d ? clone(d) : null;
      }));
    mock.method(model, 'find', (filter: any = {}) =>
      chain(async () => {
        await Promise.resolve();
        return this.docs.filter((x) => matches(x, filter)).map(clone);
      }));
    // single-document atomic operations (synchronous body = atomic)
    mock.method(model, 'findOneAndUpdate', (filter: any, update: any) =>
      chain(async () => {
        const d = this.docs.find((x) => matches(x, filter));
        if (!d) return null;
        applyUpdate(d, update);
        return clone(d);
      }));
    mock.method(model, 'updateOne', (filter: any, update: any) =>
      Promise.resolve().then(() => {
        const d = this.docs.find((x) => matches(x, filter));
        if (d) applyUpdate(d, update);
        return { matchedCount: d ? 1 : 0, modifiedCount: d ? 1 : 0 };
      }));
  }
}

export const oid = () => new mongoose.Types.ObjectId();
