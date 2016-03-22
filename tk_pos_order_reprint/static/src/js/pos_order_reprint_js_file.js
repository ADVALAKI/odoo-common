openerp.tk_pos_order_reprint = function (instance, module) {
    module = instance.point_of_sale;
    var QWeb = instance.web.qweb;
    _t = instance.web._t;
    var OrderSuper = module.ProductListWidget;

    module.PosWidget = module.PosWidget.extend({
        template: 'PosWidget',
        renderElement: function () {

            var self = this;
            this._super();

            // _.each(this.pos.cashregisters,function(cashregister) {
            var button = new module.OrderRepaintButtonWidget(self);
            button.insertAfter('.pos .pos-topheader .pos-rightheader');
            // });
        }
    });

    module.OrderRepaintButtonWidget = module.ClientListScreenWidget.extend({
        template: 'OrderRepaintButtonWidget',

        init: function (parent, options) {
            this._super(parent, options);

        },
        renderElement: function () {
            var self = this;
            this._super();

            this.$('.order-button').click(function (options) {

                var current_scr = self.pos_widget.screen_selector.get_current_screen();
                if (current_scr == 'clientlist') {
                    self.pos_widget.screen_selector.back();

                }
                else {
                    var button = new module.PosOrderScreenWidget(self);
                    self.pos_widget.screen_selector.set_current_screen('clientlist');
                    setTimeout(function () {
                        button.replace('.clientlist-screen .screen-content');
                    }, 25);
                }

            });

        },

    });

    module.Order = module.Order.extend({

        initialize: function (attributes) {
            Backbone.Model.prototype.initialize.apply(this, arguments);
            this.pos = attributes.pos;
            this.sequence_number = this.pos.pos_session.sequence_number++;
            this.uid = this.generateUniqueId();
            this.set({
                creationDate: new Date(),
                orderLines: new module.OrderlineCollection(),
                paymentLines: new module.PaymentlineCollection(),
                name: _t("Order ") + this.uid,
                client: null,
            });
            this.selected_orderline = undefined;
            this.selected_paymentline = undefined;
            this.screen_data = {};  // see ScreenSelector
            this.receipt_type = 'receipt';  // 'receipt' || 'invoice'

            this.temporary = attributes.temporary || false;
            this.xml_receipt = '';
            return this;
        },

        get_order_xml_receipt: function(){
            return this.xml_receipt;
        },

        set_order_xml_receipt: function(str_xml){
            this.xml_receipt = str_xml;
        },

        export_as_JSON: function() {
            var orderLines, paymentLines;
            orderLines = [];
            (this.get('orderLines')).each(_.bind( function(item) {
                return orderLines.push([0, 0, item.export_as_JSON()]);
            }, this));
            paymentLines = [];
            (this.get('paymentLines')).each(_.bind( function(item) {
                return paymentLines.push([0, 0, item.export_as_JSON()]);
            }, this));
            return {
                name: this.getName(),
                amount_paid: this.getPaidTotal(),
                amount_total: this.getTotalTaxIncluded(),
                amount_tax: this.getTax(),
                amount_return: this.getChange(),
                lines: orderLines,
                statement_ids: paymentLines,
                pos_session_id: this.pos.pos_session.id,
                partner_id: this.get_client() ? this.get_client().id : false,
                user_id: this.pos.cashier ? this.pos.cashier.id : this.pos.user.id,
                uid: this.uid,
                sequence_number: this.sequence_number,
                xml_receipt: this.xml_receipt,
            };
        },
    });

    module.PaymentScreenWidget.include({

        before_print_hook: function(currentOrder) {
            var receipt = currentOrder.export_for_printing();
            var xml_receipt = QWeb.render('XmlReceipt',{receipt: receipt, widget: self,});
            currentOrder.set_order_xml_receipt(xml_receipt);
            return currentOrder
        }

    });

    module.PosOrderScreenWidget = module.PosBaseWidget.extend({
        template: 'PosOrderScreenWidget',

        init: function (parent, options) {
            this._super(parent, options);
            this.pos = parent.pos;


        },
        get_pos_order: function () {
            return this.pos.get('wk_pos_order_list');

        },
        renderElement: function () {
            var self = this;
            this._super();

            var HTMLContent = '';
            var order_data = self.pos.get('wk_pos_order_list');

            if (order_data != null) {
                var t = 1;
                for (i = 0; i < order_data.length; i++) {
                    temp = self.pos.db.get_partner_by_id(order_data[i].partner_id[0]);
                    var name = '-';
                    if (temp != null) {
                        name = temp.name;
                    }
                    if (t == 0) {
                        HTMLContent += "<tr class='wk_table_back'><td>" + order_data[i].name + "</td><td>" + name + "</td><td>" + order_data[i].date_order + "</td><td><button class='wk_print_content' id='" + order_data[i].id + "' >Print</button></td><td><button class='wk_print_content_pdf' id='" + order_data[i].id + "' >Print PDF</button></td><tr>";

                        t = 1
                    }
                    else {
                        HTMLContent += "<tr><td>" + order_data[i].name + "</td><td>" + name + "</td><td>" + order_data[i].date_order + "</td><td><button class='wk_print_content' id='" + order_data[i].id + "' >Print</button></td><td><button class='wk_print_content_pdf' id='" + order_data[i].id + "' >Print PDF</button></td><tr>";
                        t = 0;
                    }
                }
                this.$(".client-list-contents").append($(HTMLContent));
            }

            this.$('.wk_print_content').click(function (options) {
                var order_id = this.id;

                (new instance.web.Model('pos.order')).call('get_xml_receipt', [order_id]).then(function (result) {
                    var xml = result;
                    self.pos.proxy.print_receipt(xml);
                });

            })

            this.$('.wk_print_content_pdf').click(function (options) {
                var order_id = this.id;

                datas = {'ids': order_id}
                var action = {
                    'type': 'ir.actions.report.xml',
                    'report_name': 'point_of_sale.action_report_pos_receipt',
                    'datas': datas,
                };
                (new instance.web.Model('pos.order')).call('wk_print_report')

                    .then(function (result) {

                        instance.client.action_manager.do_action(result, {
                            additional_context: {
                                active_id: order_id,
                                active_ids: [order_id],
                                active_model: 'pos.order'
                            }
                        })


                    })
                    .fail(function (error, event) {
                        self.pos_widget.screen_selector.show_popup('error', {
                            message: _t('Error!!!'),
                            comment: _t('Check your internet connection and try again.'),
                        });
                        event.preventDefault();


                    });

            })

            this.$('.wk_cancel_button').click(function (options) {

                self.pos_widget.screen_selector.back();

            });

        },

    });

    var PosModelSuper = module.PosModel
    module.PosModel = module.PosModel.extend({
        load_server_data: function () {
            var self = this;

            var loaded = PosModelSuper.prototype.load_server_data.call(this);
            loaded = loaded.then(function () {
                return self.fetch(
                    'pos.order',
                    ['id', 'name', 'date_order', 'partner_id'],
                    [['session_id', '=', self.pos_session.name], ['state', 'not in', ['cancel', 'done']]])
                    .then(function (orders) {
                        self.set({'wk_pos_order_list': orders});
                    });
            });
            return loaded;
        },
        _save_to_server: function (orders, options) {
            if (!orders || !orders.length) {
                var result = $.Deferred();
                result.resolve([]);
                return result;
            }

            options = options || {};

            var self = this;
            var timeout = typeof options.timeout === 'number' ? options.timeout : 7500 * orders.length;

            // we try to send the order. shadow prevents a spinner if it takes too long. (unless we are sending an invoice,
            // then we want to notify the user that we are waiting on something )
            var posOrderModel = new instance.web.Model('pos.order');
            return posOrderModel.call('create_from_ui',
                [_.map(orders, function (order) {


                    order.to_invoice = options.to_invoice || false;
                    return order;
                })],
                undefined,
                {
                    shadow: !options.to_invoice,
                    timeout: timeout
                }
            ).then(function (server_ids) {
                    if (server_ids != []) {
                        self.fetch(
                            'pos.order',
                            ['id', 'name', 'date_order', 'partner_id'],
                            [['id', '=', server_ids]])
                            .then(function (orders) {
                                var orders_data = self.get('wk_pos_order_list');
                                var full_order = orders.concat(orders_data);
                                self.set({'wk_pos_order_list': full_order});
                            });
                    }
                    _.each(orders, function (order) {

                        self.db.remove_order(order.id);
                    });
                    return server_ids;
                }).fail(function (error, event) {
                    if (error.code === 200) {    // Business Logic Error, not a connection problem
                        self.pos_widget.screen_selector.show_popup('error-traceback', {
                            message: error.data.message,
                            comment: error.data.debug
                        });
                    }
                    // prevent an error popup creation by the rpc failure
                    // we want the failure to be silent as we send the orders in the background
                    event.preventDefault();
                    console.error('Failed to send orders:', orders);
                });
        },
    });
}
