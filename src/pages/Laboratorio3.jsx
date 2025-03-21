import React from "react";
import Lab_3 from "../components/Lab_3";

const Laboratorio3 = () => {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Laboratorio 3: Agrupacion de Elementos sin React</h1>
      <p>
        Este ejercicio muestra un escenario 3D con una base y tres figuras geométricas (cubo, esfera y cono)
      </p>
      <div style={{ height: "600px" }}>
        <Lab_3 />
      </div>
    </div>
  );
};

export default Laboratorio3;
