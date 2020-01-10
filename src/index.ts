import VueClass from 'vue'

import install from './install'

export default {
  install
}

export * from './helpers'
export * from './install'

export { mapState, mapAction } from './vuex'

// export { mapFields as mapState, mapMethods as mapAction } from './helpers'

