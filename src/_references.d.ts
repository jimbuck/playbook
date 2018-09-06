declare class Conf
{
  public get(key: string): any;

  public set(key: string, val: any): void;

  public delete(key: string): void;

  public has(key: string): boolean;
}