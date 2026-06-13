import {Pool} from "pg"


export default class BaseRepository {
  protected defaultLimit = 10;
  protected defaultOffset = 0;
  protected pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  getPool() {
    return this.pool;
  }

}

export type Constructor<T = {}> = new (...args: any[]) => T;