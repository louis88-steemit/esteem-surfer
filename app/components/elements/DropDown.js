// @flow
import React, { Component } from 'react';

import { Dropdown as RealDropDown } from 'antd';
import Mi from './Mi';

type Props = {
  menu: {},
  location: {}
};

export default class DropDown extends Component<Props> {
  props: Props;

  constructor(props) {
    super(props);

    this.state = {
      hover: false
    };
  }

  componentDidUpdate(prevProps) {
    // Set hover false when location changed.
    const { location } = this.props;
    if (location !== prevProps.location) {
      setTimeout(() => {
        this.setState({ hover: false });
      }, 300);
    }
  }

  visibleChanged(e) {
    this.setState({ hover: e });
  }

  render() {
    let caretClassName = 'drop-down-caret';

    const { hover } = this.state;
    const { menu } = this.props;

    if (hover) {
      caretClassName += ' hover';
    }

    return (
      <RealDropDown
        overlay={menu}
        onVisibleChange={e => this.visibleChanged(e)}
      >
        <span className={caretClassName}>
          <Mi icon="arrow_drop_down" />
        </span>
      </RealDropDown>
    );
  }
}
