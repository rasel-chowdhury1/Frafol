import amqp from 'amqplib';

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  const connection = await amqp.connect('amqp://localhost'); // বা RabbitMQ URI
  channel = await connection.createChannel();
  console.log('RabbitMQ connected');
};

export const getChannel = () => {
  if (!channel) throw new Error('RabbitMQ not connected');
  return channel;
};
