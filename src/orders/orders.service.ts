import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATES,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { TakeOrderInput, TakeOrderOutput } from './dtos/take-order.dto';
import { Order, OrderStatus } from './entities/oder.entity';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
    @Inject(PUB_SUB) private readonly pubsub: PubSub,
  ) {}

  async getOrders(
    user: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    try {
      let orders: Order[];
      if (user.role === UserRole.Client) {
        orders = await this.orders.find({
          where: {
            customer: user,
            ...(status && { status }),
          },
        });
      } else if (user.role === UserRole.Delivery) {
        orders = await this.orders.find({
          where: {
            driver: user,
            ...(status && { status }),
          },
        });
      } else if (user.role === UserRole.Owner) {
        const restaurants = await this.restaurants.find({
          where: { owner: user },
          relations: ['orders'],
        });
        orders = restaurants.map((restaurant) => restaurant.orders).flat(1);
        if (status) {
          orders = orders.filter((order) => order.status === status);
        }
      }
      return { ok: true, orders };
    } catch (error) {
      return { ok: false, error: 'Could not find orders' };
    }
  }

  async getOrder(
    user: User,
    { id: orderId }: GetOrderInput,
  ): Promise<GetOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId, {
        relations: ['restaurant'],
      });
      if (!order) {
        return { ok: false, error: 'Order not found' };
      }
      if (
        (user.id !== order.customerId && user.role === UserRole.Client) ||
        (user.id !== order.driverId && user.role === UserRole.Delivery) ||
        (user.id !== order.restaurant.ownerId && user.role === UserRole.Owner)
      ) {
        return { ok: false, error: 'You can not see that' };
      }
      return { ok: true, order };
    } catch (error) {
      return { ok: false, error: 'Could not find order' };
    }
  }

  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      let orderTotalPrice = 0;
      const orderItems: OrderItem[] = [];
      for (const item of items) {
        const dish = await this.dishes.findOne(item.dishId);
        if (!dish) {
          return { ok: false, error: 'Dish not found' };
        }
        let dishTotlaPrice: number = dish.price;
        for (const itemOption of item.options) {
          const dishOption = dish.options.find(
            (dishOption) => dishOption.name === itemOption.name,
          );
          if (dishOption) {
            if (dishOption.extra) {
              dishTotlaPrice += dishOption.extra;
            } else {
              const dishOptionChoice = dishOption.choices?.find(
                (choice) => choice.name === itemOption.choice,
              );
              if (dishOptionChoice) {
                if (dishOptionChoice.extra) {
                  dishTotlaPrice += dishOptionChoice.extra;
                }
              }
            }
          }
        }
        orderTotalPrice += dishTotlaPrice;
        const orderItem = await this.orderItems.save(
          this.orderItems.create({ dish, options: item.options }),
        );
        orderItems.push(orderItem);
      }
      const order = await this.orders.save(
        this.orders.create({
          customer,
          restaurant,
          total: orderTotalPrice,
          items: orderItems,
        }),
      );
      this.pubsub.publish(NEW_PENDING_ORDER, {
        pendingOrders: { order, ownerId: restaurant.ownerId },
      });
      return { ok: true, orderId: order.id };
    } catch (error) {
      return { ok: false, error: 'Could not create order' };
    }
  }

  async editOrder(
    user: User,
    { id: orderId, status }: EditOrderInput,
  ): Promise<EditOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId);
      if (!order) {
        return { ok: false, error: 'Order not found' };
      }
      if (
        (user.id !== order.customerId && user.role === UserRole.Client) ||
        (user.id !== order.driverId && user.role === UserRole.Delivery) ||
        (user.id !== order.restaurant.ownerId && user.role === UserRole.Owner)
      ) {
        return { ok: false, error: 'You can not see that' };
      }
      if (
        user.role === UserRole.Client ||
        (user.role === UserRole.Owner &&
          status !== OrderStatus.Cooking &&
          status !== OrderStatus.Cooked) ||
        (user.role === UserRole.Delivery &&
          status !== OrderStatus.PickedUp &&
          status !== OrderStatus.Delivered)
      ) {
        return { ok: false, error: 'You can not edit that' };
      }
      await this.orders.save({ id: orderId, status });
      if (user.role === UserRole.Owner && status === OrderStatus.Cooked) {
        this.pubsub.publish(NEW_COOKED_ORDER, {
          cookedOrder: { ...order, status },
        });
      }
      this.pubsub.publish(NEW_ORDER_UPDATES, {
        orderUpdates: { ...order, status },
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not edit order' };
    }
  }

  async takeOrder(
    driver: User,
    { id: orderId }: TakeOrderInput,
  ): Promise<TakeOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId);
      if (!order) {
        return { ok: false, error: 'Order not found' };
      }
      if (order.driverId) {
        return { ok: false, error: 'This order already has a driver' };
      }
      await this.orders.save({ id: orderId, driver });
      this.pubsub.publish(NEW_ORDER_UPDATES, {
        orderUpdates: { ...order, driver },
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not take order' };
    }
  }
}
