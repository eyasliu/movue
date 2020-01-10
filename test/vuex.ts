import Vue from 'vue'
import { reaction, observable, runInAction, action, computed } from 'mobx'
import Movue, { mapState, mapAction } from '../src'

const nextTick = Vue.nextTick

Vue.use(Movue)

class Counter {
  @observable num = 0
  @computed get numPlus() {
    return this.num + 1
  }
  @action setNum(value) {
    this.num = value
  }
  @action plus() {
    this.setNum(this.num + 1)
  }
  @action reset() {
    this.setNum(0)
  }
}

test("compatible vuex mapState & mapAction api" done => {
  const counter = new Counter()
  const vm = new Vue({
    store: counter,
    computed: {
      ...mapState(['num', 'numPlus']),
    },
    methods: {
      ...mapAction(['setNum', 'plus', 'reset'])
    },
    render(h) {
      const vm: any = this
      return h('div', `${vm.num}|${vm.numPlus}`)
    }
  }).$mount()
  expect(vm.$el.textContent).toBe('0|1')

  vm.setNum(2)
  nextTick(() => {
    expect(vm.$el.textContent).toBe('2|3')
    vm.plus()
    nextTick(() => {
      expect(vm.$el.textContent).toBe('3|4')
      vm.reset()
      nextTick(() => {
        expect(vm.$el.textContent).toBe('0|1')
        done()
      })
    })
  })
})