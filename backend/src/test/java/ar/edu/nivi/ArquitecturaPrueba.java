package ar.edu.nivi;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ArquitecturaPrueba {
    @Test void nucleoSinFrameworksNiAdaptadores() {
        var clases = new ClassFileImporter().importPackages("ar.edu.nivi");
        noClasses().that().resideInAnyPackage("..dominio..", "..aplicacion..")
                .should().dependOnClassesThat().resideInAnyPackage("org.springframework..", "jakarta..", "com.fasterxml..", "..infraestructura..", "..configuracion..")
                .check(clases);
        noClasses().that().resideInAPackage("..dominio..").should().dependOnClassesThat().resideInAPackage("..aplicacion..").check(clases);
    }
}
