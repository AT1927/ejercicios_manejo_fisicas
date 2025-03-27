import React from "react";
import Lab_4 from "../components/Lab_4";

const Laboratorio4 = () => {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Ejercicios Manejo Fisicas: Efectos Automovil</h1>
      <p>
        Este ejercicio integra un automovil 3D con sus luces realistas y efecto de sonido de colision 
        cuando el modelo interactua con el escenario.
      </p>
      <div style={{ height: "800px", width: "100%"}}>
        <Lab_4 />
      </div>
    </div>
  );
};

export default Laboratorio4;
