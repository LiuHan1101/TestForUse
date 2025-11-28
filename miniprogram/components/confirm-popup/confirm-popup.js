// components/confirm-popup/confirm-popup.js
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    productInfo: {
      type: Object,
      value: {
        image: '',
        title: '',
        price: 0,
        quantity: 1
      }
    },
    orderInfo: {
      type: Object,
      value: {
        orderNumber: '',
        deliveryTime: '',
        tip: ''
      }
    }
  },

  data: {
    defaultTip: '协商发货后订单须在约定发货当天24点前发出并接收，该时间将作为是否延迟发货的判断依据，请知悉。注：消费者仅支持手机操作'
  },

  methods: {
    onMaskTap() {
      this.triggerEvent('close');
    },

    onContainerTap(e) {
      e.stopPropagation();
    },

    preventTouchMove() {
      return;
    },

    onCancel() {
      this.triggerEvent('cancel');
      this.triggerEvent('close');
    },

    onConfirm() {
      this.triggerEvent('confirm');
    }
  },

  lifetimes: {
    attached() {
      // 设置默认提示内容
      if (!this.data.orderInfo.tip) {
        this.setData({
          'orderInfo.tip': this.data.defaultTip
        });
      }
    }
  }
})