import ChangeDetector from './change-detector'
import { createStore, createComputedProp } from './helper'



export function install(Vue, prestore) {
  const changeDetector = new ChangeDetector(Vue)
  const store = createStore(prestore)

  function beforeCreate(vm) {
    // inject $store
    const options = vm.$options
    if (options.store) {
      vm.$store = createStore((typeof options.store === 'function'
        ? options.store()
        : options.store
      ) || store)
    } else if (options.parent && options.parent.$store) {
      vm.$store = options.parent.$store
    } else if (store) {
      vm.$store = createStore(store)
    }
  
    // inject computed
    // hack compatible vuex mapState
    if(vm.$options.computed && vm.$options.computed[MAP_STATE_FIELD]) {
      vm.$options[MAP_STATE_FIELD] = vm.$options.computed[MAP_STATE_FIELD]
      delete vm.$options.computed[MAP_STATE_FIELD]
    }

    vm.$options.computed = getMapComputed(vm).reduce(
      (computed, {key, set}) => {
        changeDetector.defineReactiveProperty(vm, key)
        computed[key] = createComputedProp(changeDetector, vm.$store, vm, key, set)
        return computed
      }, 
      vm.$options.computed || {}
    )
  
    // inject methods
    vm.$options.methods = getMapMethod(vm).reduce(
      (methods, {key, method}) => {
        methods[key] = method
        return methods
      },
      vm.$options.methods || {}
    )
  }

  function created(vm) {
    changeDetector.defineReactionList(vm, getMapComputed(vm))
  }

  function beforeDestroy(vm) {
    changeDetector.removeReactionList(vm)
    getMapComputed(vm).forEach(({key}) => changeDetector.removeReactiveProperty(vm, key))
  }

  Vue.mixin({
    beforeCreate,
    created,
    beforeDestroy
  })

}