import {observable} from 'mobx'
import { Getter, Setter } from './types'

export type PropList<TPropType> = string[] | { [propAlias: string]: TPropType }
export type FieldDescription = {
  get: string | ((store: object) => any),
  set?: string | ((store: object, value: any) => void)
}
export type MappedField = Getter | { get: Getter, set?: Setter }
export type propMaper<TPropType, TResult> = (store: object, propName: TPropType) => TResult

function mapProps<TPropType, TMapResult>(
  store: object,
  propNames: PropList<TPropType>,
  mapProp: propMaper<TPropType, TMapResult>
): object {
  const isArray = Array.isArray(propNames)

  return Object.keys(propNames).reduce(
    (result, key) => {
      const propAlias = isArray ? propNames[key] : key
      const propName = propNames[key]

      return Object.assign(result, {
        [propAlias]: mapProp(store, propName)
      })
    },
    {}
  )
}

function mapField(store: object, fieldDescription: string | FieldDescription): MappedField {
  if (typeof fieldDescription === 'string') {
    return () => store[fieldDescription]
  }

  const fieldDescriptionGet = fieldDescription.get
  let getter
  if (typeof fieldDescriptionGet === 'function') {
    getter = function () { return fieldDescriptionGet.call(this, store) }
  } else {
    getter = () => store[fieldDescriptionGet]
  }

  const fieldDescriptionSet = fieldDescription.set
  let setter
  if (typeof fieldDescriptionSet === 'function') {
    setter = function (value) { fieldDescriptionSet.call(this, store, value) }
  } else if (typeof fieldDescriptionSet === 'string') {
    setter = (value) => { store[fieldDescriptionSet](value) }
  }

  return {
    get: getter,
    set: setter
  }
}

export function mapFields(store: object, fieldNames: PropList<string> | PropList<FieldDescription>): object {
  return mapProps(store, fieldNames, mapField)
}

function mapMethod(store: object, methodName: string): Function {
  return store[methodName].bind(store)
}

export function mapMethods(store: object, methodNames: PropList<string>): object {
  return mapProps(store, methodNames, mapMethod)
}

// helper method to use movue with vue-class-component
// It's not a good idea to introduce vue-class-component as either dependencies or peerDependencies,
// So we need to keep this method's logic compatible with vue-class-component's decorator logic.
// https://github.com/vuejs/vue-class-component/blob/2bc36c50551446972d4b423b2c69f9f6ebf21770/src/util.ts#L17
// export function FromMobx(target: any, key: string) {
//   const Ctor = target.constructor
//   const decorators = Ctor.__decorators__ = Ctor.__decorators__ || []
//   decorators.push(options => {
//     options.fromMobx = options.fromMobx || {}
//     options.fromMobx[key] = options.computed[key]
//     delete options.computed[key]
//   })
// }

// observable wrap store
export function createStore(store: any): any {
  if (store && store.constructor === Object) {
    store = observable(store)
  }
  return store
}

export function arrayOptionToObj(arr: string[]): {key: string} {
  return arr.reduce((m, p) => {
    const key = p.split('.').pop()
    m[key] = p
    return m
  }, {})
}

/**
* 获取一个对象指定路径的值
* 
* @param {object} obj 需要获取的对象
* @param {string} key 对象的路径
* @param {any} def 如果指定路径没有值，返回的默认值
* 
* @example 
* ```
* get(window, 'location.host', 'default value')
* ```
*/
export const get = (obj, key, def?, p?) => {
  if (typeof key === 'undefined') return def
  p = 0;
  key = key.split ? key.split('.') : key;
  while (obj && p < key.length) obj = obj[key[p++]];
  return (obj === undefined || p < key.length) ? def : obj;
}

export const getParent = (store, field) => {
  let caller = store
  switch (field.split('.').length) {
    case 0:
    case 1:
      caller = store
      break;
    default:
      const parentField = field.substr(0, field.lastIndexOf('.'))
      const parent = get(store, parentField)
      caller = parent
      break;
  }
  return caller
}