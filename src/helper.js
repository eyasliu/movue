import {observable} from 'mobx'
import { MAP_STATE_FIELD, MAP_ACTION_FIELD} from './vuex'

// observable wrap store
export function createStore(store) {
  if (typeof store === 'undefined' || store === null) {
    return store
  }
  if (store && store.constructor === Object) {
    store = observable(store)
  }
  return store
}

/**
 * Return a function expect two param contains namespace and map. it will normalize the namespace and then the param's function will handle the new namespace and the map.
 * @param {Function} fn
 * @return {Function}
 */
export function normalizeNamespace (fn) {
  return (namespace, map) => {
    if (typeof namespace !== 'string') {
      map = namespace
      namespace = ''
    } else {
      namespace = namespace.replace(/\//, '.')
      if (namespace.charAt(namespace.length - 1) !== '.') {
        namespace += '.'
      }
    }
    return fn(namespace, map)
  }
}
function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

/**
 * Validate whether given map is valid or not
 * @param {*} map
 * @return {Boolean}
 */
function isValidMap (map) {
  return Array.isArray(map) || isObject(map)
}

/**
 * Normalize the map
 * normalizeMap([1, 2, 3]) => [ { key: 1, val: 1 }, { key: 2, val: 2 }, { key: 3, val: 3 } ]
 * normalizeMap({a: 1, b: 2, c: 3}) => [ { key: 'a', val: 1 }, { key: 'b', val: 2 }, { key: 'c', val: 3 } ]
 * @param {Array|Object} map
 * @return {Object}
 */
export function normalizeMap (map) {
  if (!isValidMap(map)) {
    return []
  }
  return Array.isArray(map)
    ? map.map(key => ({ key, val: key }))
    : Object.keys(map).map(key => ({ key, val: map[key] }))
  
}

export function arrayOptionToObj(arr){
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
export const get = (obj, key, def, p) => {
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

export const createComputedProp = (changeDetector, store, vm, key, setter) => {
  const getter = () => changeDetector.getReactiveProperty(vm, key)

  if (typeof setter === 'function') {
    return {
      get: getter,
      set: (value) => setter.call(vm, value, store)
    }
  }

  return getter
}

export const getMapComputed = (vm) => {
  const opt = normalizeMap(vm.$options.$mapState)
    .concat(normalizeMap(vm.$options[MAP_STATE_FIELD]))
  
  if (!opt.length) {
    return []
  }

  const store = vm.$store
  return opt.map(({key, val}) => {
    let getter = val
    let setter = null
    
    if (typeof val === 'string') {
      val = val.replace(/\//, '.')
      // {field: 'name.x.y'}
      getter = () => get(store, val)
    } else if (typeof val === 'function') {
      // {field: store => store.name}
      getter = () => val.call(vm, store)
    } else if (typeof val === 'object') {
      // {field: {get: store => store.name, set: (value, store) => store.setName(val)}}
      if (typeof val.get === 'string') {
        val.get = val.get.replace(/\//, '.')
        getter = () => get(store, val.get)
      } else if (typeof val.get === 'function') {
        getter = () => val.get.call(vm, store)
      }

      if (typeof val.set === 'string') {
        val.set = val.set.replace(/\//, '.')
        setter = (val) => get(store, val.set).call(getParent(store, val.set), val, store)
      } else if (typeof val.set === 'function') {
        setter = (val) => val.set.call(vm, val, store)
      }
    }
    console.log("======", key, val, getter)
    return {
      key,
      get: getter,
      set: setter,
    }
  })

}
export const getMapMethod = vm => {
  const opt = normalizeMap(vm.$options.$mapAction).concat(normalizeMap(vm.$options[MAP_ACTION_FIELD]))

  if (!opt.length) {
    return []
  }

  const store = vm.$store
  return opt.map(({key, val}) => {
    let method = val
    if (typeof method === 'string') {
      // {field: 'name'}
      method = get(store, field).bind(getParent(store, field))
    } else if (typeof method === 'function') {
      // {field: store => store.name}
      method = field.call(vm, store)
    }

    return {
      key,
      method,
    }
  })
}