name=PM5

all: $(name).pdf

force:
	rm -f $(name).pdf
	make all

$(name).pdf: *.tex *.cls
	pdflatex $(name)
	pdflatex $(name)
	pdflatex $(name)

clean:
	rm -f *.aux *.toc *.log *.out *.bbl *.blg $(name).pdf
