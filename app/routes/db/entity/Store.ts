import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  store_name!: string;

  @Column({ nullable: true, type: "varchar" })
  preferred_color!: string;

  @Column({ nullable: true, type: "varchar" })
  support_email!: string;

  @Column({ nullable: true, type: "varchar" })
  support_phone!: string;
}