from openerp.osv import orm, fields

class tk_purchase_order(orm.Model):
    _inherit = 'purchase.order' \
               ''
    def _prepare_order_line_move(self, cr, uid, order, order_line, picking_id, group_id, context=None):
        """
        override _prepare_order_line_move method. Add packaging info in stock move
        """
        res = super(tk_purchase_order, self)._prepare_order_line_move(cr, uid, order, order_line, picking_id, group_id, context=context)
        for line in res:
            line.update({
                'qty_packaging': order_line.qty_packaging,
                'packaging_id': order_line.packaging_id.id,
            })
        return res

tk_purchase_order()

class tk_purchase_order_line(orm.Model):
    _inherit = 'purchase.order.line'


    def onchange_product_id(self, cr, uid, ids, pricelist_id, product_id, qty, uom_id, partner_id, date_order=False, fiscal_position_id=False, date_planned=False,
                            name=False, price_unit=False, state='draft', context=None):

        """
        Override the on change product id. Fetch product packaging linked to the selected product on pre-fill packaging if one result is found
        """
        # Objects
        packaging_obj = self.pool.get('product.packaging')
        product_product_obj = self.pool.get('product.product')

        res = super(tk_purchase_order_line, self).onchange_product_id(cr, uid, ids, pricelist_id, product_id, qty, uom_id, partner_id, date_order=date_order, fiscal_position_id=fiscal_position_id, date_planned=date_planned,
                                                                        name=name, price_unit=price_unit, state=state, context=context)
        if not res:
            res = {}

        if not 'value' in res:
            res['value'] = {}
            res['domain'] = {}

        if product_id:
            product_record = product_product_obj.read(cr, uid, product_id, ['product_tmpl_id'])
            product_tmpl_id = product_record.get('product_tmpl_id', False)
            if product_tmpl_id:
                packaging_ids = packaging_obj.search(cr, uid, [('product_tmpl_id', '=', product_tmpl_id[0]), ('delivery', '=', True)])
                if packaging_ids and len(packaging_ids) == 1:
                    res['value'].update({'packaging_id': packaging_ids[0]})
                    res['domain'].update({'packaging_id': [('product_tmpl_id', '=', product_tmpl_id[0])]})

        return res


    def _get_product_qty(self, cr, uid, packaging_id, qty_packaging=0, context=None):
        """
        Internal method. Called in on_change, write and create method. This method compute the packaging qty * qty in purchase order line
        """
        # Objects
        packaging_obj = self.pool.get('product.packaging')

        packaging_record = packaging_obj.read(cr, uid, packaging_id, ['qty'], context=context)
        return packaging_record.get('qty', 0) * qty_packaging

    def onchange_qty_packaging(self, cr, uid, ids, qty_packaging, packaging_id, context=None):
        """
        Recompute the product quantity when the packaging quantity is changed (packaging qty * packaging coefficient (qty))
        """
        res = {}
        if packaging_id:
            res['value'] = {'product_qty': self._get_product_qty(cr, uid, packaging_id, qty_packaging, context)}
        return res

    def write(self, cr, uid, ids, vals, context=None):
        """
        Override write method. Force write on product qty read only in the view.
        """
        qty_packaging = -1
        packaging_id = False

        if 'qty_packaging' in vals:
            qty_packaging = vals.get('qty_packaging', 0)
        if 'packaging_id' in vals:
            packaging_id = packaging_id

        if 'qty_packaging' in vals or 'packaging_id' in vals:
            for line_record in self.read(cr, uid, ids, ['qty_packaging', 'packaging_id']):
                if qty_packaging == -1:
                    qty_packaging = line_record.get('qty_packaging', 0)
                if not packaging_id:
                    packaging_id = line_record.get('packaging_id', False)

                if qty_packaging and packaging_id:
                    packaging_id = packaging_id[0]

                    vals['product_qty'] = self._get_product_qty(cr, uid, packaging_id, qty_packaging, context)


                    super(tk_purchase_order_line, self).write(cr, uid, [line_record.get('id')], vals, context)
        return super(tk_purchase_order_line, self).write(cr, uid, ids, vals, context)

    def create(self, cr, uid, vals, context=None):
        if 'qty_packaging' in vals and 'packaging_id' in vals:
            vals['product_qty'] = self._get_product_qty(cr, uid, vals['packaging_id'], vals['qty_packaging'], context)
        return super(tk_purchase_order_line, self).create(cr, uid, vals, context)


    def _get_packaging_domain(self, cr, uid, ids, name, args, context=None):
        # Objects
        packaging_obj = self.pool.get('product.packaging')

        res = {}
        for po_line in self.browse(cr, uid, ids, context=context):
            product_tmpl_id = po_line.product_id and po_line.product_id.product_tmpl_id.id or False
            if not product_tmpl_id:
                res[po_line.id] = False
            else:
                packaging_ids = packaging_obj.search(cr, uid, [('product_tmpl_id', '=', product_tmpl_id), ('delivery', '=', True)])
                if not packaging_ids:
                    res[po_line.id] = False
                else:
                    res[po_line.id] = packaging_ids

        return res

    _columns = {
        'qty_packaging': fields.integer('Quantity Packaging', required=False),
        'packaging_id': fields.many2one('product.packaging', 'Packaging', required=False),
        'packaging_domain_ids': fields.function(_get_packaging_domain, type='many2many', obj='product.packaging', store=False),

    }

tk_purchase_order_line()
