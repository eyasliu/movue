import VueClass from 'vue'
import * as mobxMethods from 'mobx'
import ChangeDetector from './change-detector'
import { createStore, get, getParent } from './helpers'
import { Getter, Setter, VueComputed, FromMobxEntry, FromMobxAction, IMobxMethods, mapOption } from './types'

export { IMobxMethods }

declare module 'vue/types/options' {
  interface ComponentOptions<V extends VueClass> {
    $store?: any,
    $mapState?: mapOption,
    $mapAction?: mapOption,
  }
}

export default function install(Vue: typeof VueClass, store: any) {
  const changeDetector = new ChangeDetector(Vue, mobxMethods)

  function beforeCreate(this: VueClass) {
    const vm = this

    // inject $store
    const options = this.$options
    if (options.store) {
      vm.$store = createStore((typeof options.store === 'function'
        ? options.store()
        : options.store
      ) || store)
    } else if (options.parent && options.parent.$store) {
      this.$store = options.parent.$store
    }
    // inject computed
    vm.$options.computed = getFromStoreEntries(vm).reduce(
      (computed, { key, set }) => {
        changeDetector.defineReactiveProperty(vm, key)

        return Object.assign(
          computed,
          { [key]: createComputedProperty(changeDetector, vm, key, set) }
        )
      },
      vm.$options.computed || {}
    )
    // inject methods
    vm.$options.methods = getFromStoreActions(vm).reduce(
      (method, { key, method: func }) => {

        return Object.assign(
          method,
          { [key]: func }
        )
      },
      vm.$options.methods || {}
    )
  }

  function created(this: VueClass) {
    const vm = this

    changeDetector.defineReactionList(vm, getFromStoreEntries(vm))
  }

  function beforeDestroy(this: VueClass) {
    const vm = this

    changeDetector.removeReactionList(vm)
    getFromStoreEntries(vm).forEach(({ key }) => changeDetector.removeReactiveProperty(vm, key))
  }

  Vue.mixin({
    beforeCreate,
    created,
    beforeDestroy
  })
}

function createComputedProperty(
  changeDetector: ChangeDetector,
  vm: VueClass,
  key: string,
  setter?: Setter
): VueComputed {
  const getter: Getter = () => changeDetector.getReactiveProperty(vm, key)

  if (typeof setter === 'function') {
    return {
      get: getter,
      set: (value) => setter.call(vm, value)
    }
  }

  return getter
}

function getFromStoreEntries(vm: VueClass): FromMobxEntry[] {
  let fromStore = vm.$options.$mapState
  if (vm.$options.mixins) {
    const fromStoreInMixins = vm.$options.mixins
      .map((mixin: any) => mixin.$mapState)
      .reduce((accum, fromMobx) => fromMobx ? { ...accum, ...fromMobx } : accum, {})
    fromStore = {
      ...fromStoreInMixins,
      ...fromStore
    }
  }

  if (!fromStore) {
    return []
  }
  const store = vm.$store

  // string[]
  if (Array.isArray(fromStore)) {
    return fromStore.map(val => {
      const key = val.split('.').pop()
      return {
        key,
        get: () => get(store, val),
        set: null,
      }
    })
  }

  // object
  return Object.keys(fromStore).map(key => {
    const field: any = fromStore[key]

    let getter = field
    let setter = null
    if (typeof getter === 'string') {
      // {field: 'name'}
      getter = () => get(store, field)
    } else if (typeof getter === 'function') {
      // {field: store => store.name}
      getter = () => field.call(vm, store)
    } else if (typeof getter === 'object') {
      // {field: {get: store => store.name, set: (store, val) => store.setName(val)}}
      if (typeof field.get === 'string') {
        getter = () => get(store, field.get)
      } else if (typeof field.get === 'function') {
        getter = () => field.get.call(vm, store)
      }
      
      if (typeof field.set === 'string') {
        setter = (val) => get(store, field.set).call(getParent(store, field.set), val, store)
      } else if (typeof field.set === 'function') {
        setter = (val) => field.set.call(vm, val, store)
      }
    }

    return {
      key,
      get: getter,
      set: setter,
    }
  })
}

function getFromStoreActions(vm: VueClass): FromMobxAction[] {
  let fromStore = vm.$options.$mapAction

  if (!fromStore) {
    return []
  }

  const store = vm.$store

  // string[]
  if (Array.isArray(fromStore)) {
    return fromStore.map(field => {
      const key = field.split('.').pop()
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
      const method = get(store, field).bind(caller)
      return {
        key,
        method,
      }
    })
  }

  return Object.keys(fromStore).map(key => {
    const field: any = fromStore[key]


    let method = field
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
