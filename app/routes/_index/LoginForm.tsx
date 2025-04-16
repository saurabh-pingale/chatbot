import { Form } from "@remix-run/react";
import styles from "./styles.module.css";

export function LoginForm() {
  return (
    <Form className={styles.form} method="post" action="/auth/login">
      <label className={styles.label}>
        <span>Shop domain</span>
        <input className={styles.input} type="text" name="shop" />
        <span>e.g: my-shop-domain.myshopify.com</span>
      </label>
      <button className={styles.button} type="submit">
        Log in
      </button>
    </Form>
  );
}