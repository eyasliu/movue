import {mapOption} from './types'

export const MAP_STATE_FIELD = "__$mobxMapState__"
export const MAP_ACTION_FIELD = "__$mobxMapAction__"

export const mapState = (opt: mapOption): object => {
  return {
    [MAP_STATE_FIELD]: opt
  }
}

export const mapAction = (opt: mapOption): object => {
  return {
    [MAP_ACTION_FIELD]: opt
  }
}