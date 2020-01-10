import Vue from 'vue'
import { reaction, observable, runInAction, action, computed } from 'mobx'
import Movue from '../src'

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

test("options is array", done => {
  const counter = new Counter()
  const vm = new Vue({
    store: counter,
    $mapState: ['num', 'numPlus'],
    $mapAction: ['setNum', 'plus', 'reset'],
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

test("option is object", done => {
  const counter = new Counter()
  const vm = new Vue({
    store: counter,
    $mapState: {
      num: 'num',
      xnum: 'num'
      ynum: state => state.num,
      numPlus: 'numPlus',
      xnumPlus: 'numPlus',
      ynumPlus: state => state.numPlus,
    },
    $mapAction: {
      setNum: 'setNum',
      xplus: state => state.plus,
      reset: state => state.reset.bind(state)
    },
    render(h) {
      const vm: any = this
      return h('div', `${vm.num}|${vm.xnum}|${vm.ynum}|${vm.numPlus}|${vm.xnumPlus}|${vm.ynumPlus}`)
    }
  }).$mount()
  expect(vm.$el.textContent).toBe('0|0|0|1|1|1')

  vm.setNum(2)
  nextTick(() => {
    expect(vm.$el.textContent).toBe('2|2|2|3|3|3')
    vm.xplus()
    nextTick(() => {
      expect(vm.$el.textContent).toBe('3|3|3|4|4|4')
      vm.reset()
      nextTick(() => {
        expect(vm.$el.textContent).toBe('0|0|0|1|1|1')
        done()
      })
    })
  })
})

test("operate in children compoment", done => {
  const counter = new Counter()

  

  const child = {
    $mapState: {
      num: 'num',
      xnum: 'num'
      ynum: state => state.num,
      numPlus: 'numPlus',
      xnumPlus: 'numPlus',
      ynumPlus: state => state.numPlus,
    },
    $mapAction: {
      setNum: 'setNum',
      xplus: state => state.plus,
      reset: state => state.reset.bind(state)
    },
    render(h) {
      const vm: any = this
      return h('div', `${vm.num}|${vm.xnum}|${vm.ynum}|${vm.numPlus}|${vm.xnumPlus}|${vm.ynumPlus}`)
    }
  }

  const root = new Vue({
    store: counter,
    render: h => h(child)
  }).$mount()

  const vm = root.$children[0]
  expect(root.$el.textContent).toBe('0|0|0|1|1|1')

  vm.setNum(2)
  nextTick(() => {
    expect(root.$el.textContent).toBe('2|2|2|3|3|3')
    vm.xplus()
    nextTick(() => {
      expect(root.$el.textContent).toBe('3|3|3|4|4|4')
      vm.reset()
      nextTick(() => {
        expect(root.$el.textContent).toBe('0|0|0|1|1|1')
        done()
      })
    })
  })
})

test("store is deep object and options array", done => {
  const counter = new Counter()
  const vm = new Vue({
    store: {
      a: {
        b: {
          c: {
            d: {
              e: counter
            }
          }
        }
      }
    },
    $mapState: ['a.b.c.d.e.num', 'a.b.c.d.e.numPlus'],
    $mapAction: ['a.b.c.d.e.setNum', 'a.b.c.d.e.plus', 'a.b.c.d.e.reset'],
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

test("store is deep object and options object", done => {
  const counter = new Counter()
  const vm = new Vue({
    store: {
      a: {
        b: {
          c: {
            d: {
              e: counter
            }
          }
        }
      }
    },
    $mapState: {
      num: 'a.b.c.d.e.num',
      xnum: 'a.b.c.d.e.num',
      ynum: state => state.a.b.c.d.e.num,
      numPlus: 'a.b.c.d.e.numPlus',
      xnumPlus: 'a.b.c.d.e.numPlus',
      ynumPlus: state => state.a.b.c.d.e.numPlus,
    },
    $mapAction: {
      setNum: 'a.b.c.d.e.setNum',
      xplus: state => state.a.b.c.d.e.plus,
      reset: state => state.a.b.c.d.e.reset.bind(state.a.b.c.d.e)
    },
    render(h) {
      const vm: any = this
      return h('div', `${vm.num}|${vm.xnum}|${vm.ynum}|${vm.numPlus}|${vm.xnumPlus}|${vm.ynumPlus}`)
    }
  }).$mount()
  expect(vm.$el.textContent).toBe('0|0|0|1|1|1')

  vm.setNum(2)
  nextTick(() => {
    expect(vm.$el.textContent).toBe('2|2|2|3|3|3')
    vm.xplus()
    nextTick(() => {
      expect(vm.$el.textContent).toBe('3|3|3|4|4|4')
      vm.reset()
      nextTick(() => {
        expect(vm.$el.textContent).toBe('0|0|0|1|1|1')
        done()
      })
    })
  })
})